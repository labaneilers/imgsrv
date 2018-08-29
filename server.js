'use strict';

// Framework dependencies
const express = require('express');
const fs = require('fs');
const httpContext = require('express-http-context');
const newrelic = process.env.NEW_RELIC_LICENSE_KEY ? require('newrelic') : null;

// Modules
const errorHandling = require('./error-handling');
const optimize = require('./optimize');
const TempTracker = require('./temptracker').TempTracker;
const api = require('./api');
const proxy = require('./proxy');
const OriginWhitelist = require('./origin-whitelist').OriginWhitelist;
const frame = require('./frame');
const log = require('./logger');
const Timer = require('./timer').Timer;

// Constants
const PORT = 80;
const HOST = '0.0.0.0';
const TEMP_DIR = process.env.IMGSRV_TEMP || (__dirname + '/tmp');

// App
const app = express();

// Middleware to keep request-scoped state for JSON logging
app.use(httpContext.middleware);

// Create a whitelist of allowed domains/paths for source images
// If none is supplied, all domains are allowed
const originWhitelist = new OriginWhitelist(process.env.IMGSRV_ORIGIN_WHITELIST);

// Main image optimization proxy route
app.get('/', async (req, res, next) => {

  if (newrelic) {
    newrelic.setTransactionName('GET/');
  }

  // Keep track of temp files so we can clean them up after each request
  let tempTracker = new TempTracker(TEMP_DIR);

  // Initialize the log with a request ID and URL
  log.init(tempTracker.id, req.url);

  // Instrument performance
  let timer = new Timer();

  try {

    let params = api.parseParams(req);

    // Validate the source URL is in the whitelist of allowed domains
    // Reduces surface area for DOS attack
    originWhitelist.validate(params.uri);

    log.write('perf', timer.messages);

    // Get the source file and save to disk
    timer.start('get');
    let tempFile = await proxy.getFile(params.uri, tempTracker);
    timer.stop('get');

    // Generate the best optimized version of the file
    timer.start('optimize');
    let optimizedFile = await optimize.optimize(tempFile, params.width, params.allowWebp, params.allowJp2, params.allowJxr, tempTracker);
    timer.stop('optimize');

    log.write({
      resultFile: optimizedFile.path,
      resultSize: optimizedFile.fileSize
    });

    // Write the optimized file to the browser
    timer.start('send');
    await proxy.sendFile(res, optimizedFile.path, optimizedFile.mimeType);
    timer.stop('send');

    log.flush();

  } catch (ex) {

    timer.cleanup();
    next(ex);

  } finally {

    // Clean up temp files
    if (tempTracker) {
      await tempTracker.cleanup();
    }
  }
});

// Renders a page which contains an image with the same params
// Useful for testing browser-sniffing and URL generation
app.get('/frame', async (req, res, next) => {
  try {
    let params = api.parseParams(req);
    await frame.write(req, res, next);
  } catch (ex) {
    next(ex);
  }
});

// Error handling goes last
app.use(errorHandling.middleware);
app.listen(PORT, HOST);

// Ensure there's a temp dir
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

log.writeNoRequest({
  source: log.sourceName,
  startup: `http://${HOST}:${PORT}`,
  env: process.env.NODE_ENV || 'development',
  tmp: TEMP_DIR,
  verbose: log.verbose,
  maxSize: proxy.maxSize,
  maxWidth: api.maxWidth,
  originTimeout: proxy.originTimeout,
  whitelist: originWhitelist.getStatus()
});
