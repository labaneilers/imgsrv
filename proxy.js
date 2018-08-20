'use strict';

const request = require('request');
const util = require('util');
const fs = require('fs');
const log = require('./logger');

const MAX_SIZE = process.env.IMGSRV_MAX_SIZE || 3145728; // 3MB
const ORIGIN_TIMEOUT = process.env.IMGSRV_ORIGIN_TIMEOUT || 10000;

const validateResponse = function(response) {

  if (response.statusCode != 200) {
      throw new Error(`Requested image failed with status code: ${response.statusCode}`);
  }

  let contentTypeHeader = response.headers['content-type'];

  if (!contentTypeHeader) {
    throw new Error('Requested image failed: no content type specified');
  }

  let splitContentType = contentTypeHeader.split('/');
  let contentTypeCategory = splitContentType[0];
  let ext = splitContentType[1];

  if (contentTypeCategory != 'image') {
    throw new Error(`Requested image failed: content type ${contentTypeCategory}`);
  }

  let contentLength = parseInt(response.headers['content-length']);
  if (contentLength > MAX_SIZE) {
    throw new Error(`Request image larger than max size: ${MAX_SIZE} (was ${contentLength})`);
  }

  log.write('origin', {
    statusCode: response.statusCode,
    contentType: contentTypeHeader,
    contentLength: contentLength
  });

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
    insecure: process.env.NODE_TLS_REJECT_UNAUTHORIZED == '0',
    timeout: ORIGIN_TIMEOUT || 10000
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

      let size = 0;

      try {
        r.on('data', (data) => {
            size += data.length;

            if (size > MAX_SIZE) {
                res.abort(); // Abort the response (close and cleanup the stream)
                throw new Error(`Request image larger than max size: ${MAX_SIZE} (was ${contentLength})`);
            }
        }).pipe(fileStream);
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
        'content-type': mimeType,
        'X-RequestID': log.requestId()
      }
    }
  );
};

exports.getFile = util.promisify(getFile);
exports.sendFile = sendFile;
exports.maxSize = MAX_SIZE;
exports.originTimeout = ORIGIN_TIMEOUT;
