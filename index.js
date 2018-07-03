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
app.get('/', async (req, res) => {

  // TODO querystring
  let uri = 'https://www.vistaprint.com/merch/www/mc/legacy/images/vp-site/vhp/marquee/BasicMarqueeA/GL-outdoor-signage-001-2x-hccd3814da8fbc9167eef977d96ab455e7.png';

  let options = {
      method: 'GET',
      encoding: 'binary',
      uri: uri,
      resolveWithFullResponse: true
  };

  let response = await request(options);

  console.log(response.statusCode);

  let contentType = response.headers['content-type'];
  console.log(contentType);

  if (!contentType) {
    res.send('No content type\n');
    return;
  }

  let splitContentType = contentType.split('/');
  if (splitContentType[0] != 'image') {
    res.send('Content type not an image\n');
    return;
  }

  let tempFile = __dirname + '/tmp/' + uuid() + '.' + splitContentType[1];
  tempFile = path.normalize(tempFile);

  await writeFile(tempFile, response.body, 'binary');

  let size = await optimize.imageSize(tempFile);
  let fileSize = await optimize.fileSize(tempFile);
  var bestFile = await optimize.optimize(tempFile, 300);

  console.log(JSON.stringify(size));
  console.log(fileSize);
  console.log("new file: " + bestFile.path);
  console.log(bestFile.fileSize);

  await res.sendFile(
    bestFile.path, 
    { 
      maxAge: 31449600, 
      headers: {
        "content-type": "image/png"
      }
    },
    async err => {
      await deleteFile(bestFile.path);
      await deleteFile(tempFile);
      console.log("done");
    }
  );
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);