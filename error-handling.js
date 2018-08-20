'use strict';

const log = require('./logger');
const api = require('./api');

const respondWithError = function(res, requestId, message) {
    res
        .status(500)
        .set({
            'cache-control': 'no-cache',
            'content-type': 'text/html',
            'X-RequestID': requestId
        })
        .send(`<html><head><title>Error</title></head><body><pre>${message}</pre><pre>RequestID: ${requestId}</pre></body></html>`);
};

const errorHandlingMiddleware = function (err, req, res, next) {
    log.error(err);
    log.flush();

    if (process.env.NODE_ENV == 'production') {
        respondWithError(res, log.requestId(), err.message);
    } else {
        if (err instanceof api.NonCanonicalParamsError) {
            res.redirect(req.path + '?' + err.canonicalQs);
            return;
        }

        respondWithError(res, log.requestId(), err.stack);
    }
};

module.exports.middleware = errorHandlingMiddleware;