'use strict';

const express = require('express');
const path = require('path');
const request = require('request-promise-native');
const fs = require('fs');
const uuid = require('uuid/v4');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const optimize = require("./optimize");
const TempTracker = require("./temptracker").TempTracker;

// Constants
const PORT = 80;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', async (req, res, next) => {

  //
  try {
    let uri = req.query.u;
    let width = parseInt(req.query.w) || 500;
    let allowWebp = req.query.webp == "1";
    let allowJp2 = req.query.jp2 == "1";

    console.log(uri);
    console.log(`width: ${width}`);

    if (!uri) {
      throw new Error("u (uri) parameter required");
    }

    if (width > 2400) {
      throw new Error("w parameter too large");
    }

    if (width < 2) {
      throw new Error("w parameter too small");
    }

    // TODO whitelist allowed domains

    let response = await request({
        method: 'GET',
        encoding: 'binary',
        uri: uri,
        resolveWithFullResponse: true
      });

    console.log(`status: ${response.statusCode}`);

    let contentType = response.headers['content-type'];
    console.log(contentType);

    if (!contentType) {
      throw new Error('No content type\n');
    }

    let splitContentType = contentType.split('/');
    if (splitContentType[0] != 'image') {
      throw new Error('Content type not an image\n');
    }

    let tempFile = __dirname + '/tmp/' + uuid() + '.' + splitContentType[1];
    tempFile = path.normalize(tempFile);

    let tempTracker = new TempTracker();
    tempTracker.add(tempFile);

    await writeFile(tempFile, response.body, 'binary');

    var bestFile = await optimize.optimize(tempFile, width, allowWebp, allowJp2, tempTracker);
    
    console.log("best file: " + bestFile.path);
    console.log("best file size: " + bestFile.fileSize);

    await res.sendFile(
      bestFile.path, 
      { 
        maxAge: 31449600, // Cache for 1 year
        headers: {
          "content-type": "image/" + bestFile.type
        }
      },
      async err => {
        await tempTracker.cleanup();
        console.log("done");
      }
    );
  }
  catch (ex) {
    console.log(ex);
    next(ex);
  }
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);