'use strict';

// Framework dependencies
const express = require('express');
const fs = require('fs');

// Modules
const optimize = require("./optimize");
const TempTracker = require("./temptracker").TempTracker;
const api = require('./api');
const proxy = require('./proxy');

// Constants
const PORT = 80;
const HOST = '0.0.0.0';
const TEMP_DIR = __dirname + '/tmp';

// App
const app = express();
app.get('/', async (req, res, next) => {

  console.log("fuu");
  
  let tempTracker;

  try {

    let params = api.parseParams(req);

    // TODO whitelist allowed domains

    tempTracker = new TempTracker(TEMP_DIR);

    // Get the source file and save to disk
    let tempFile = await proxy.getFile(params.uri, tempTracker);

    // Generate the best optimized version of the file
    let optimizedFile = await optimize.optimize(tempFile, params.width, params.allowWebp, params.allowJp2, tempTracker);
    
    console.log(`optimized file: ${optimizedFile.path} (${optimizedFile.fileSize} bytes)`);

    // Write the optimized file to the browser
    await proxy.sendFile(res, optimizedFile.path, optimizedFile.type);

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

// Ensure there's a temp dir
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);