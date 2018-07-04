'use strict';

function parseParams(request) {

    let options = {
        uri: request.query.u,
        width: parseInt(request.query.w) || 500,
        allowWebp: request.query.webp == "1",
        allowJp2: request.query.jp2 == "1"
    };

    // console.log(uri);
    // console.log(`width: ${width}`);

    if (!options.uri) {
      throw new Error("u (uri) parameter required");
    }

    if (options.width > 2400) {
      throw new Error("w parameter too large");
    }

    if (options.width < 2) {
      throw new Error("w parameter too small");
    }

    // TODO enforce parameter order

    return options;
}

exports.parseParams = parseParams;