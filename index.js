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

    console.log(ex);
    next(ex);

  } finally {

    // Clean up temp files
    await tempTracker.cleanup();
  }
});

// Ensure there's a temp dir
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);