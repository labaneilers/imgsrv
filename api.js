'use strict';

const querystring = require('querystring');
const url = require('url');

function getCanonicalQueryString(options) {
  let canonicalQs = {
    u: options.uri,
    w: options.width
  };

  if (options.allowWebp) {
    canonicalQs.webp = "1";
  } 
  if (options.allowJp2) {
    canonicalQs.jp2 = "1";
  }

  return querystring.stringify(canonicalQs);
}

function validateCanonicalQuerystring(request, options)
{
  let canonicalQs = getCanonicalQueryString(options);
  let suppliedQs = url.parse(request.url).query;

  if (canonicalQs != suppliedQs) {
    throw new Error(`Params order and encoding is strict to enforce cachability\nCanonical: ${canonicalQs}\nActual:${suppliedQs}`);
  }
}

function parseParams(request) {

    let options = {
        uri: request.query.u,
        width: parseInt(request.query.w) || 500,
        allowWebp: request.query.webp == "1",
        allowJp2: request.query.jp2 == "1"
    };

    if (!options.uri) {
      throw new Error("u (uri) parameter required");
    }

    if (options.width > 2400) {
      throw new Error("w parameter too large");
    }

    if (options.width < 2) {
      throw new Error("w parameter too small");
    }

    // Ensure querystring format is consistent to maximize caching
    validateCanonicalQuerystring(request, options);

    return options;
}

exports.parseParams = parseParams;