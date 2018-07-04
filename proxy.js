'use strict';

const path = require('path');
const request = require('request');
const util = require('util');
const fs = require('fs');
const writeFile = util.promisify(fs.writeFile);

const validateResponse = function(response) {
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

  return {
    ext: ext
  };
};

const getFile = function (uri, tempTracker, callback) {

  let tempFile;
  let fileStream;

  // NOTE: Can't use async/await/promises with request module
  // when streaming files to disk. The tradeoff is worth it because
  // this uses less memory than storing the whole file in a buffer.
  // Use callbacks and wrap with a promise.

  let r = request.get(uri);

  r.on('error', ex => {
      callback(ex);
    })
    .on('response', response => {
      let validation = validateResponse(response);  
      tempFile = tempTracker.create(validation.ext);
      fileStream = fs.createWriteStream(tempFile, { encoding: 'binary' });
      fileStream.on('finish', () => { 
        callback(null, tempFile);
      });
  
      fileStream.on('err', ex => { 
        callback(ex);
      });

      r.pipe(fileStream);
    }); 
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

exports.getFile = util.promisify(getFile);
exports.sendFile = sendFile;
