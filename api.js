'use strict';

class NonCanonicalParamsError extends Error {
  constructor(canonicalQs, actualQs) {
    let message = `Params order and encoding is strict to enforce cachability\nCanonical: ${canonicalQs}\nActual:${actualQs}`;
    super(message);

    this.canonicalQs = canonicalQs;
    this.actualQs = actualQs;

    Error.captureStackTrace(this, NonCanonicalParamsError);
  }
}

const querystring = require('querystring');
const url = require('url');

function getCanonicalQueryString(options) {
  let canonicalQs = {
    u: options.uri,
    w: options.width
  };

  if (options.allowWebp) {
    canonicalQs.webp = '1';
  }
  if (options.allowJp2) {
    canonicalQs.jp2 = '1';
  }
  if (options.allowJxr) {
    canonicalQs.jxr = '1';
  }

  return querystring.stringify(canonicalQs);
}

function validateCanonicalQuerystring(request, options) {
  let canonicalQs = getCanonicalQueryString(options);
  let actualQs = url.parse(request.url).query;

  if (canonicalQs != actualQs) {
    throw new NonCanonicalParamsError(canonicalQs, actualQs);
  }
}

function parseParams(request) {

    let options = {
        uri: request.query.u,
        width: parseInt(request.query.w) || 500,
        allowWebp: request.query.webp == '1',
        allowJp2: request.query.jp2 == '1',
        allowJxr: request.query.jxr == '1'
    };

    if (!options.uri) {
      throw new Error('u (uri) parameter required');
    }

    if (options.width > 2400) {
      throw new Error('w parameter too large');
    }

    if (options.width < 2) {
      throw new Error('w parameter too small');
    }

    // Ensure querystring format is consistent to maximize caching
    validateCanonicalQuerystring(request, options);

    return options;
}

exports.parseParams = parseParams;
exports.NonCanonicalParamsError = NonCanonicalParamsError;