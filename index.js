'use strict';

const express = require('express');
const path = require('path');
const request = require('request-promise-native');
const fs = require('fs');
const uuid = require('uuid/v4');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const deleteFile = util.promisify(fs.unlink);
const awaitWriteStream = require('await-stream-ready').write;
const optimize = require("./optimize");

// Constants
const PORT = 80;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', async (req, res, next) => {

  //https://upload.wikimedia.org/wikipedia/commons/b/bb/Pickle.jpg
  try {
    let uri = req.query.u || 'https://www.vistaprint.com/merch/www/mc/legacy/images/vp-site/vhp/marquee/BasicMarqueeA/GL-outdoor-signage-001-2x-hccd3814da8fbc9167eef977d96ab455e7.png';
    let width = req.query.w || 500;
    let allowWebp = req.query.webp == "1";
    let allowJp2 = req.query.jp2 == "1";

    console.log(uri);
    console.log(`width: ${width}`);

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

    await writeFile(tempFile, response.body, 'binary');

    var bestFile = await optimize.optimize(tempFile, width, allowWebp, allowJp2);
    
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
        await deleteFile(bestFile.path);
        await deleteFile(tempFile);
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