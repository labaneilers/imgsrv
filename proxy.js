'use strict';

const request = require('request');
const util = require('util');
const fs = require('fs');

const validateResponse = function(response) {
  console.log(`Origin status code: ${response.statusCode}`);

  if (response.statusCode != 200) {
      throw new Error(`Requested image failed with status code: ${response.statusCode}`);
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

  let r = request.get({
    uri: uri,
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36' //'imgsrv proxy (https://github.com/labaneilers/imgsrv)'
    },
    insecure: process.env.NODE_TLS_REJECT_UNAUTHORIZED == '0'
  });

  r.on('error', ex => {
      callback(ex);
    })
    .on('response', response => {
      try {
        let validation = validateResponse(response);
        tempFile = tempTracker.create(validation.ext);
        fileStream = fs.createWriteStream(tempFile, { encoding: 'binary' });
      } catch (ex) {
        callback(ex);
        return;
      }

      fileStream.on('finish', () => {
        callback(null, tempFile);
      });

      fileStream.on('err', ex => {
        callback(ex);
      });

      try {
        r.pipe(fileStream);
      } catch (ex) {
        callback(ex);
      }
    });
};

const sendFile = async function(response, filePath, mimeType) {
  let sendFile = util.promisify(response.sendFile.bind(response));

  await sendFile(
    filePath,
    {
      maxAge: '1y',
      headers: {
        'content-type': mimeType
      }
    }
  );
};

exports.getFile = util.promisify(getFile);
exports.sendFile = sendFile;
