'use strict';

const path = require('path');
const request = require('request-promise-native');
const util = require('util');
const fs = require('fs');
const writeFile = util.promisify(fs.writeFile);

const getFile = async function (uri, tempTracker) {
    let response = await request({
        method: 'GET',
        encoding: 'binary',
        uri: uri,
        resolveWithFullResponse: true
      });

    console.log(`status: ${response.statusCode}`);

    if (response.statusCode != 200) {
        throw new Error(`Requested image failed with status code: ${response.statusCode}`)
    }

    let contentTypeHeader = response.headers['content-type'];
    console.log(contentTypeHeader);

    if (!contentTypeHeader) {
      throw new Error('Requested image failed: no content type specified');
    }

    let splitContentType = contentTypeHeader.split('/');
    let contentTypeCategory = splitContentType[0];
    let ext = splitContentType[1];

    if (contentTypeCategory != 'image') {
      throw new Error(`Requested image failed: content type ${contentTypeCategory}`);
    }

    let tempFile = tempTracker.create(ext);

    await writeFile(tempFile, response.body, 'binary');

    return tempFile;
};

const sendFile = async function(response, filePath, ext) {
  let sendFile = util.promisify(response.sendFile.bind(response)); 

  await sendFile(
    filePath, 
    { 
      maxAge: 31449600, // Cache for 1 year
      headers: {
        "content-type": "image/" + ext
      }
    }
  );
};

exports.getFile = getFile;
exports.sendFile = sendFile;
