const express = require('express');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
const database = require('./database');
const { google } = require('googleapis');
const { smtp_user, smtp_pass } = require('./config');
const fs = require('fs').promises;
const path = require('path');
const fastCsv = require('fast-csv');
const { v4: uuidv4 } = require('uuid');

// App
const app = express();
app.use(express.json());
app.use(morgan('common'));

// Google API Auth
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

let oAuth2Client;
let drive;
let resolveAuthPromise;

async function setupGoogleDriveApi() {
  console.log('Configuring Google API');
  try {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    oAuth2Client.on('tokens', async (token) => {
      console.log('New Access Token: ' + token.access_token);
      console.log('Expires: ' + token.expiry_date);
      try {
        // Read the existing token
        let existingToken = await fs.readFile(TOKEN_PATH, 'utf8');
        existingToken = JSON.parse(existingToken);

        // Update the existing token with any new values
        const updatedToken = { ...existingToken, ...token };

        // Save the updated token
        await fs.writeFile(TOKEN_PATH, JSON.stringify(updatedToken), 'utf8');
        console.log('Token updated and saved.');
      } catch (err) {
        console.error('Error updating the token:', err);
      }
    });

    try {
      const token = await fs.readFile(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(token));
    } catch (err) {
      const tokenObtained = await getAccessToken(); // This should now be an async function
      if (!tokenObtained) {
        throw new Error('Failed to obtain access token');
      }
    }

    drive = google.drive({ version: 'v3', auth: oAuth2Client });
    return true;
  } catch (err) {
    console.log('Error setting up Google Drive API:', err);
    throw err; // Rethrow the error for handling elsewhere if necessary
  }
}

async function getAccessToken() {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  return new Promise((resolve, reject) => {
    resolveAuthPromise = resolve;
  });
}

async function syncDriveFile(fileId) {
  const response = await drive.files.export(
    {
      fileId: fileId,
      mimeType: 'text/csv',
    },
    { responseType: 'stream' }
  );

  const rows = [];
  await new Promise((resolve, reject) => {
    response.data
      .pipe(fastCsv.parse({ headers: true }))
      .on('data', (row) => rows.push(row))
      .on('error', (error) => reject(error))
      .on('end', () => resolve());
  });

  // Step 2: Upsert data into the database
  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
  for (const [index, row] of rows.entries()) {
    await upsertRow(fileId, index + 1, row, columnNames);
  }

  // Step 3: Delete stale rows
  await deleteStaleRows(fileId, rows);
}

async function upsertRow(fileId, rowNum, rowData, columnNames) {
  // Check and add missing columns, including 'quantitative_grade'
  await checkAndAddColumns('routeData', [...columnNames, 'quantitative_grade', 'FA_sanitized', 'name_sanitized']);

  // Calculate the quantitative_grade
  rowData.quantitative_grade = calculateQuantitativeGrade(rowData.Grade);

  // Sanitize the FA name
  rowData.FA_sanitized = sanitizeFA(rowData.FA);

  // Sanitize the route name
  rowData.name_sanitized = sanitizeName(rowData.Name);

  await database('routeData')
    .insert({
      ...rowData,
      file_id: fileId,
      row_num: rowNum,
    })
    .onConflict(['file_id', 'row_num'])
    .merge();
}

function sanitizeFA(name) {
  name = name.replace(/\(.*?\)/g, '');
  if (name.length > 1) {
    name = name.replace(/\?/g, '');
  }
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function calculateQuantitativeGrade(grade) {
  const regex = /5\.(\d\d)(\/|\\)?(a|b|c|d)?.*/;
  const match = grade.match(regex);

  if (match) {
    let quantitativeGrade = parseInt(match[1], 10);

    if (match[2]) {
      quantitativeGrade += 0.1; // Add 0.1 if group 2 is present
    }

    switch (match[3]) {
      case 'a':
        break; // Add 0 for 'a'
      case 'b':
        quantitativeGrade += 0.25;
        break;
      case 'c':
        quantitativeGrade += 0.5;
        break;
      case 'd':
        quantitativeGrade += 0.75;
        break;
    }

    return quantitativeGrade;
  } else {
    return null; // Return null if the grade does not match the regex
  }
}

const sanitizeName = (str) => {
  const articles = ['a', 'an', 'the'];
  const conjunctions = ['for', 'and', 'nor', 'but', 'or', 'yet', 'so'];
  const prepositions = [
    'with',
    'at',
    'from',
    'in',
    'into',
    'upon',
    'of',
    'to',
    'in',
    'for',
    'on',
    'by',
    'like',
    'over',
    'plus',
    'but',
    'up',
    'down',
    'off',
    'near',
  ];

  // The list of spacial characters can be tweaked here
  // const replaceCharsWithSpace = (str) => str.replace(/[^0-9a-z&/\\]/gi, " ").replace(/(\s\s+)/gi, " ");
  const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.substr(1);
  const normalizeStr = (str) => str.toLowerCase().trim();
  const shouldCapitalize = (word, fullWordList, posWithinStr) => {
    if (posWithinStr === 0 || posWithinStr === fullWordList.length - 1) {
      return true;
    }

    return !(articles.includes(word) || conjunctions.includes(word) || prepositions.includes(word));
  };

  //str = normalizeStr(str);

  let words = str.split(' ');
  if (words.length <= 2) {
    // Strings less than 3 words long should always have first words capitalized
    words = words.map((w) => capitalizeFirstLetter(w));
  } else {
    for (let i = 0; i < words.length; i++) {
      var word = words[i];
      if (word.toUpperCase === word) {
      } else {
        word = normalizeStr(word);
      }
      words[i] = shouldCapitalize(word, words, i) ? capitalizeFirstLetter(word, words, i) : word;
    }
  }

  return words.join(' ');
};

async function checkAndAddColumns(tableName, columnNames) {
  // Get existing columns from the table
  const existingColumns = await database.table(tableName).columnInfo();
  const existingColumnNames = Object.keys(existingColumns);

  for (const columnName of columnNames) {
    if (!existingColumnNames.includes(columnName)) {
      // Add the missing column to the table
      await database.schema.table(tableName, function (table) {
        table.text(columnName); // or choose another appropriate type
      });
    }
  }
}

async function deleteStaleRows(fileId, currentData) {
  const existingRows = await database('routeData').where({ file_id: fileId }).select('row_num');

  const currentRowNums = new Set(currentData.map((_, index) => index + 1));
  for (const row of existingRows) {
    if (!currentRowNums.has(row.row_num)) {
      await database('routeData').where({ file_id: fileId, row_num: row.row_num }).delete();
    }
  }
}

async function stopWatch(watch_id, watchResourceId) {
  try {
    // Stop the watch
    await drive.channels.stop({
      requestBody: {
        id: watch_id,
        resourceId: watchResourceId,
      },
    });

    // Delete the watch record from the database
    await database('gdrive_watches')
      .where({
        watch_id: watch_id,
        watch_resource_id: watchResourceId,
      })
      .delete();

    console.log(`Successfully stopped and deleted watch: ${watch_id}`);
  } catch (error) {
    console.error(`Error in stopAndDeleteWatch for watch ID ${watch_id}:`, error);
    throw error; // Rethrow the error for further handling if needed
  }
}

// Function to set up watch on a Google Sheets file
async function watchGoogleSheet(fileId) {
  const watches = await database('gdrive_watches').select('*');
  for (const watch of watches) {
    try {
      await stopWatch(watch.watch_id, watch.watch_resource_id);
    } catch (error) {
      console.error(`Error stopping watch for resource ID ${watch.watch_resource_id}:`, error);
    }
  }

  // Attempt to set an expiration date 100 years in the future
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 24);
  const expirationTimestamp = expiration.getTime();

  // Create a new watch
  const response = await drive.files.watch({
    fileId: fileId,
    requestBody: {
      id: `gunks-hardest-watch-${uuidv4()}`,
      type: 'web_hook',
      address: 'https://www.costin.rocks/api/receiveNotifications',
      expiration: expirationTimestamp.toString(),
    },
  });

  // Update or insert the watch in the database
  await database('gdrive_watches')
    .insert({
      watch_id: response.data.id,
      watch_resource_id: response.data.resourceId,
      file_id: fileId,
      expiration: expirationTimestamp,
    })
    .onConflict('watch_id')
    .merge();

  return response;
}

app.get('/healthz', function (req, res) {
  // do app logic here to determine if app is truly healthy
  // you should return 200 if healthy, and anything else will fail
  // if you want, you should be able to restrict this to localhost (include ipv4 and ipv6)
  res.send('I am happy and healthy\n');
});

//contact form
const contactEmail = nodemailer.createTransport({
  service: 'iCloud',
  auth: {
    user: smtp_user,
    pass: smtp_pass,
  },
});

contactEmail.verify((error) => {
  if (error) {
    console.log(error);
  } else {
    console.log('Ready to Send Email');
  }
});

app.post('/contact', function (req, res) {
  const name = req.body.name;
  const email = req.body.email;
  const message = req.body.message;
  const mail = {
    from: 'costin.anghel@costin.rocks',
    to: 'costin2003@gmail.com',
    subject: 'Contact Form Submission',
    html: `<p>Name: ${name}</p>
           <p>Email: ${email}</p>
           <p>Message: ${message}</p>`,
  };
  contactEmail.sendMail(mail, (error) => {
    if (error) {
      res.json({ status: 'ERROR' });
    } else {
      res.json({ status: 'Message Sent' });
    }
  });
});

function extractFileIdFromUri(uri) {
  // Example URI: https://www.googleapis.com/drive/v3/files/file-id?alt=json&null
  const match = uri.match(/\/files\/([^\/?]+)/);
  if (!match) {
    throw new Error('Invalid resource URI format');
  }
  return match[1];
}

app.post('/receiveNotifications', async (req, res) => {
  console.log('Webhook Notification Received:');

  const resourceUri = req.headers['x-goog-resource-uri'];

  if (!resourceUri) {
    // If the header is not present, return a 501 error
    return res.status(501).send('x-goog-resource-uri header missing');
  }

  try {
    // Extract the file ID from the resource URI
    const fileId = extractFileIdFromUri(resourceUri);

    // Call syncDriveFile with the extracted file ID
    await syncDriveFile(fileId);

    res.status(200).send('Notification received and processed');
  } catch (error) {
    console.error('Error processing the notification:', error);
    res.status(500).send('Error processing the notification');
  }
});

app.get('/getHardestRoutes', async (req, res) => {
  try {
    // CORS Header for GunksApps
    const origin = req.get('Origin');
    if (origin === 'https://gunksapps.com') {
      res.header('Access-Control-Allow-Origin', 'https://gunksapps.com');
    }

    // Query the database for the specified columns
    const hardestRoutes = await database('routeData')
      .select('name_sanitized', 'grade', 'FA', 'FA_sanitized', 'Year', 'quantitative_grade')
      .where('name_sanitized', '!=', '?')
      .andWhere('quantitative_grade', '>=', '12')
      .orderBy('quantitative_grade', 'desc');

    // Send the result as a response
    res.status(200).json(hardestRoutes);
  } catch (error) {
    console.error('Error fetching hardest routes:', error);
    res.status(500).send('Error fetching hardest routes');
  }
});

app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  if (code) {
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
      console.log('Token stored to', TOKEN_PATH);
      res.send('Authentication successful! Please return to the console.');
      resolveAuthPromise(true); // Resolve the promise to indicate success
    } catch (err) {
      console.error('Error retrieving access token', err);
      res.send('Error retrieving access token. Check the console for more information.');
      resolveAuthPromise(false); // Resolve the promise with false to indicate failure
    }
  } else {
    res.send('No code provided');
    resolveAuthPromise(false); // Resolve the promise with false to indicate failure
  }
});

module.exports = { app, watchGoogleSheet, syncDriveFile, setupGoogleDriveApi };
