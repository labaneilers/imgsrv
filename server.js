'use strict';

// Framework dependencies
const express = require('express');
const fs = require('fs');


// Modules
const optimize = require("./optimize");
const TempTracker = require("./temptracker").TempTracker;
const api = require('./api');
const proxy = require('./proxy');
const DomainWhitelist = require("./domain-whitelist").DomainWhitelist;
const frame = require('./frame');

// Constants
const PORT = 80;
const HOST = '0.0.0.0';
const TEMP_DIR = __dirname + '/tmp';

// App
const app = express();

// Create a whitelist of allowed domains for source images
// If none is supplied, all domains are allowed
let domainWhitelist = new DomainWhitelist(process.env.IMGSRV_DOMAINS);

app.get('/', async (req, res, next) => {

  let tempTracker;

  try {

    let params = api.parseParams(req);

    // Validate the source URL is in the whitelist of allowed domains
    // Reduces surface area for DOS attack
    domainWhitelist.validate(params.uri);

    // Keep track of temp files so we can clean them up after each request
    tempTracker = new TempTracker(TEMP_DIR);

    // Get the source file and save to disk
    let tempFile = await proxy.getFile(params.uri, tempTracker);

    // Generate the best optimized version of the file
    let optimizedFile = await optimize.optimize(tempFile, params.width, params.allowWebp, params.allowJp2, params.allowJxr, tempTracker);
    
    console.log(`optimized file: ${optimizedFile.path} (${optimizedFile.fileSize} bytes)`);

    // Write the optimized file to the browser
    await proxy.sendFile(res, optimizedFile.path, optimizedFile.mimeType);

  } catch (ex) {

    if (process.env.NODE_ENV == "production") {
      res
        .status(500)
        .set({
          'cache-control': 'no-cache'
        })
        .send(`<html><head><title>Error</title></head><body><pre>${ex.message}</pre></body></html>`);

      console.log(ex);
    } else {
      if (ex instanceof api.NonCanonicalParamsError) {
        res.redirect("/?" + ex.canonicalQs);
        return;
      }

      next(ex);
    }

  } finally {

    // Clean up temp files
    if (tempTracker) {
      await tempTracker.cleanup();
    }
  }
});

app.get('/frame', async (req, res, next) => {
  await frame.write(req, res, next);
});

// Ensure there's a temp dir
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

domainWhitelist.printStatus(process.stdout);

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);