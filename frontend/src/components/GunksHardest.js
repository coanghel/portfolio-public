import React, { useEffect, useState, useRef } from 'react';
import { List, AutoSizer, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import { Helmet } from 'react-helmet-async';
import './GunksHardest.css';

function interpolateColor(color1, color2, factor) {
  if (arguments.length < 3) {
    factor = 0.5;
  }
  var result = color1.slice();
  for (var i = 0; i < 3; i++) {
    result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
  }
  return result;
}

function interpolateColors(colorRange, numberOfSteps, step) {
  // Ensure step is within the range
  step = Math.max(0, Math.min(step, numberOfSteps - 1));

  const totalRanges = colorRange.length - 1; // Number of color transitions
  const rangePosition = (totalRanges * step) / (numberOfSteps - 1); // Position within the total color ranges

  const startIndex = Math.floor(rangePosition); // Starting color index
  const endIndex = Math.min(startIndex + 1, totalRanges); // Ending color index

  const factor = rangePosition - startIndex; // Interpolation factor

  return interpolateColor(colorRange[startIndex], colorRange[endIndex], factor);
}

// Convert HEX to RGB
function hexToRgb(hex) {
  var bigint = parseInt(hex.slice(1), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

// Convert RGB to HEX
function rgbToHex(rgb) {
  return '#' + rgb.map((x) => x.toString(16).padStart(2, '0')).join('');
}

const gradientColors = ['#000000', '#800080', '#ff0000', '#ff7f00', '#00B400'].map(hexToRgb);

const GunksHardest = () => {
  const [routes, setRoutes] = useState([]);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [searchVisible, setSearchVisible] = useState(false);

  // Load Routes
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await fetch('/api/getHardestRoutes');
        const data = await response.json();
        setRoutes(data);
      } catch (err) {
        setError('Error fetching hardest routes');
        console.error('Error fetching hardest routes:', err);
      }
    };

    fetchRoutes();
  }, []);

  // Search Routes
  useEffect(() => {
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = routes.filter((route) => route.name_sanitized.toLowerCase().includes(lowercasedTerm));
      setFilteredRoutes(filtered);
    } else {
      setFilteredRoutes(routes);
    }
  }, [searchTerm, routes]);

  // Calc header
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.getBoundingClientRect().height);
    }
  }, [searchVisible]);

  // Toggle visibility of search input
  const toggleSearchVisibility = () => {
    setSearchVisible(!searchVisible);
  };

  const formatGrade = (grade) => {
    const regex = /5\.(\d\d)(\/|\\)?(a|b|c|d)?.*/;
    const match = grade.match(regex);
    if (match) {
      return `5.${match[1]}${match[3] || ''}`;
    } else {
      return grade;
    }
  };

  const cache = new CellMeasurerCache({
    fixedWidth: true,
    defaultHeight: 100,
  });

  const rowRenderer = ({ index, key, style, parent }) => {
    // Render the header as the first row
    /*
    if (index === 0) {
      return (
        <CellMeasurer key={key} cache={cache} parent={parent} columnIndex={0} rowIndex={index}>
          <div role="row" style={style}>
            <div className="title" role="cell">
              Gunks' Hardest Routes
            </div>
            <div className="search" role="row">
              <input
                className="search"
                type="text"
                placeholder="Search for a route"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <i className="fa fa-search fa-2x" aria-hidden="true" />
          </div>
        </CellMeasurer>
      );
    }
    */

    // Adjust index for routes as the first row is the header

    const routeIndex = index; // this was index - 1 when we were using the above section to generate the header as a list item
    const route = filteredRoutes[routeIndex];
    const formattedGrade = formatGrade(route.grade);
    const isDifferentGrade = routeIndex === 0 || formattedGrade !== formatGrade(filteredRoutes[routeIndex - 1]?.grade);
    var routeColor = rgbToHex(interpolateColors(gradientColors, routes.length, routeIndex));
    const isTR = route.grade.includes('TR');
    const fa = route.FA_sanitized || '?';
    const year = route.Year || '?';
    const fa_description = fa === '?' && year === '?' ? '?' : `${fa} - ${year}`;

    return (
      <CellMeasurer key={key} cache={cache} parent={parent} columnIndex={0} rowIndex={index}>
        <div role="row" style={style}>
          {isDifferentGrade && (
            <div className="gradeHeader" role="rowheader">
              {formattedGrade}
            </div>
          )}
          <div className="route">
            <strong role="cell" className="route-name" style={{ color: routeColor }}>
              {route.name_sanitized}
            </strong>
            <br />
            <span role="cell" className="fa-year">
              FA: {fa_description}
            </span>
            {isTR && (
              <span role="cell" className="fa-year">
                {' '}
                (TR)
              </span>
            )}
          </div>
        </div>
      </CellMeasurer>
    );
  };

  return (
    <>
      <Helmet>
        <title>Gunks Hardest Routes</title>
        <meta
          name="description"
          content="Explore the hardest climbing routes in the Gunks with First Ascent (FA) information and ratings."
        />
        <script type="application/ld+json">
          {`
            {
              "@context": "http://schema.org",
              "@type": "Dataset",
              "name": "Gunks Hardest Routes",
              "alternateName": ["Gunk's Hardest Routes", "Gunks Hardest Climbs", "Gunk's Hardest Climbs", "gunks-hardest"],
              "description" : "Gunks Hardest Routes contains a currated, organized, and formatted list of the most challenging climbs in the Shawangunk Ridge maintained by the local Gunks community",
              "keywords":[
                "SPORTING ACTIVITY  > ROCK CLIMBING > TRADITIONAL",
                "SPORTING ACTIVITY  > ROCK CLIMBING > SPORT",
                "SPORTING ACTIVITY  > ROCK CLIMBING > TOP ROPE",
                "SPORTING ACTIVITY  > ROCK CLIMBING > MIXED"
             ],
              "creator" : [
                {
                  "@type" : "Person",
                  "givenName" : "Andy",
                  "familyName" : "Salo",
                  "name" : "Andy Salo"
                },
                {
                  "@type" : "Person",
                  "givenName" : "Alan",
                  "familyName" : "Kline",
                  "name" : "Alan Kline"
                },
                {
                  "@type" : "Person",
                  "givenName" : "Matt",
                  "familyName" : "Santisi",
                  "name" : "Matt Santisi"
                },
                {
                  "@type" : "Person",
                  "givenName" : "Costin",
                  "familyName" : "Anghel",
                  "name" : "Costin Anghel"
                }               
              ],
              "license" : "https://creativecommons.org/publicdomain/zero/1.0/",
              "isAccessibleForFree" : true,
              "distribution":[
                {
                   "@type":"DataDownload",
                   "encodingFormat":"JSON",
                   "contentUrl":"https://www.costin.rocks/api/getHardestRoutes"
                }
             ],
              "spatialCoverage": {
                "@type" : "Place",
                "geo" : {
                  "@type" : "GeoCoordinates",
                  "latitude" : "41.703889",
                  "longitude" : "-74.344722"
                },
                "name" : "Shawangunk Ridge"
              }
            }
          `}
        </script>
      </Helmet>
      <div style={{ height: '100vh', width: '100%' }}>
        {error && <p>{error}</p>}
        <div ref={headerRef} className="header" style={{ position: 'fixed', top: 0, width: '100%', zIndex: 100 }}>
          <div className="title">
            Gunks' Hardest Routes
            <i className="fa fa-search" aria-hidden="true" onClick={toggleSearchVisibility} />
          </div>
          {searchVisible && (
            <div className="search" role="search">
              <input
                className="search"
                name="Route Search"
                role="searchbox"
                type="text"
                placeholder="Search for a route"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>
        <div
          key={headerHeight}
          style={{
            paddingTop: headerHeight,
            height: '100%',
          }}
        >
          <AutoSizer>
            {({ width, height }) => (
              <List
                width={width}
                height={height}
                deferredMeasurementCache={cache}
                rowCount={filteredRoutes.length}
                rowHeight={cache.rowHeight}
                rowRenderer={rowRenderer}
                overscanRowCount={3}
              />
            )}
          </AutoSizer>
        </div>
      </div>
    </>
  );
};

export default GunksHardest;
