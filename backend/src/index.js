const {
  app,
  watchGoogleSheet,
  syncDriveFile,
  setupGoogleDriveApi,
} = require("./server");
const { port } = require("./config");

const FILE_ID = "1jO4E9e1oo-_rtjj9oEf49_CkuwNobUoHOImuRvvBEPo";

let server;

// Function definitions for startWatching and syncDriveFile
// Make sure these functions are properly defined to handle the 'drive' object
async function startWatching() {
  try {
    const response = await watchGoogleSheet(FILE_ID);
    console.log("Watch established.");
  } catch (error) {
    console.error("Error establishing watch:", error);
  }
}

(async () => {
  try {
    server = app.listen(port, () => {
      console.log(`Webserver is listening on port ${port}`);
    });

    // Start your server and other tasks that depend on Google Drive API

    var driveSetup = await setupGoogleDriveApi();
    if (!driveSetup) {
      console.error("Failed to set up Google Drive API");
      return;
    }

    // Initial sync
    await syncDriveFile(FILE_ID);

    // Start watching on server start
    startWatching();

    // Continue to re-establish the watch every 12 hours
    const WATCH_INTERVAL = 3600000 * 12;
    setInterval(() => {
      startWatching();
    }, WATCH_INTERVAL);
  } catch (err) {
    console.error(
      "Failed to start server due to Google Drive API setup error:",
      err
    );
  }
})();

//
// need this in docker container to properly exit since node doesn't handle SIGINT/SIGTERM
// this also won't work on using npm start since:
// https://github.com/npm/npm/issues/4603
// https://github.com/npm/npm/pull/10868
// https://github.com/RisingStack/kubernetes-graceful-shutdown-example/blob/master/src/index.js
// if you want to use npm then start with `docker run --init` to help, but I still don't think it's
// a graceful shutdown of node process
//

// quit on ctrl-c when running docker in terminal
process.on("SIGINT", function onSigint() {
  console.info(
    "Got SIGINT (aka ctrl-c in docker). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// quit properly on docker stop
process.on("SIGTERM", function onSigterm() {
  console.info(
    "Got SIGTERM (docker container stop). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// shut down server
function shutdown() {
  if (server) {
    server.close(function onServerClosed(err) {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      process.exit(0);
    });
  } else {
    console.log("Server not started or already closed.");
    process.exit(0);
  }
}
//
// need above in docker container to properly exit
//
