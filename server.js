'use strict';

// Framework dependencies
const express = require('express');
const fs = require('fs');
const httpContext = require('express-http-context');
const newrelic = process.env.NEWRELIC_LICENSE_KEY ? require('newrelic') : null;

// Modules
const optimize = require('./optimize');
const TempTracker = require('./temptracker').TempTracker;
const api = require('./api');
const proxy = require('./proxy');
const DomainWhitelist = require('./domain-whitelist').DomainWhitelist;
const frame = require('./frame');
const log = require('./logger');

// Constants
const PORT = 80;
const HOST = '0.0.0.0';
const TEMP_DIR = process.env.IMGSRV_TEMP || (__dirname + '/tmp');

// App
const app = express();
app.use(httpContext.middleware);

// Create a whitelist of allowed domains for source images
// If none is supplied, all domains are allowed
let domainWhitelist = new DomainWhitelist(process.env.IMGSRV_DOMAINS);

let errorHandlingMiddleware = function (err, req, res, next) {
  log.error(err);
  log.flush();

  if (process.env.NODE_ENV == 'production') {
    res
      .status(500)
      .set({
        'cache-control': 'no-cache'
      })
      .send(`<html><head><title>Error</title></head><body><pre>${err.message}</pre></body></html>`);

  } else {
    if (err instanceof api.NonCanonicalParamsError) {
      res.redirect(req.path + '?' + err.canonicalQs);
      return;
    }

    res
      .status(500)
      .set({
        'cache-control': 'no-cache'
      })
      .send(`<html><head><title>Error</title></head><body><pre>${err.stack}</pre></body></html>`);
  }
};

class Timer {
  constructor(id) {
    this.id = id;
    this.timers = {};
    this.messages = {};
  }

  start(message) {
    this.timers[message] = new Date();
  }

  stop(message) {
    let now = new Date();
    let started = this.timers[message];
    let ms = now - started;
    this.messages[message] = ms;
  }
}

// Main image optimization proxy route
app.get('/', async (req, res, next) => {

  if (newrelic) {
    newrelic.setTransactionName('GET/');
  }

  log.write('url', req.url);

  let tempTracker;

  try {

    let params = api.parseParams(req);

    // Validate the source URL is in the whitelist of allowed domains
    // Reduces surface area for DOS attack
    domainWhitelist.validate(params.uri);

    // Keep track of temp files so we can clean them up after each request
    tempTracker = new TempTracker(TEMP_DIR);

    let timer = new Timer(params.uri);

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

    log.write('perf', timer.messages);

    log.flush();

  } catch (ex) {

    next(ex);

  } finally {

    // Clean up temp files
    if (tempTracker) {
      await tempTracker.cleanup();
    }
  }
});

app.get('/frame', async (req, res, next) => {
  try {
    let params = api.parseParams(req);
    await frame.write(req, res, next);
  } catch (ex) {
    next(ex);
  }
});

app.use(errorHandlingMiddleware);

// Ensure there's a temp dir
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

app.listen(PORT, HOST);
log.writeNoRequest({
  startup: `http://${HOST}:${PORT}`,
  env: process.env.NODE_ENV || 'development',
  tmp: TEMP_DIR,
  verbose: log.verbose,
  maxSize: proxy.maxSize,
  whitelist: domainWhitelist.getStatus()
});
