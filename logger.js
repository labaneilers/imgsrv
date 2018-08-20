'use strict';

// Utility for JSON logging
// Helps to bundle all logs for the same request together
// in a single JSON object

const httpContext = require('express-http-context');

// Allow setting indention for JSON logs for readability when running locally
let INDENT = null;
if (process.env.IMGSRV_LOG_INDENT) {
    INDENT = '  ';
}

const VERBOSE = process.env.IMGSRV_VERBOSE == '1';

const SOURCENAME = process.env.IMGSRV_SOURCENAME || 'imgsrv';

const getLog = function() {
    let log = httpContext.get('log');
    if (!log) {
        log = {};
        httpContext.set('log', log);
    }
    return log;
};

const print = function(obj) {
    let data = JSON.stringify(obj, null, INDENT);
    if (obj.errors) {
        console.error(data);
    } else if (VERBOSE) {
        console.log(data);
    }
};

module.exports = {

    init: function(requestId, url) {
        let log = getLog();
        log.source = SOURCENAME || 'imgsrv';
        log.requestID = requestId;
        log.url = url;
        log.timestamp = (new Date()).toUTCString();
    },

    write: function(key, value) {
        let log = getLog();
        if (typeof(key) == 'object') {
            Object.assign(log, key);
        } else {
            log[key] = value;
        }
    },

    warning: function(message) {
        let log = getLog();
        let warnings = log.warnings;
        if (!warnings) {
            log.warnings = warnings = [];
        }

        warnings.push(message);
    },

    error: function(ex) {
        let log = getLog();
        let errors = log.errors;
        if (!errors) {
            log.errors = errors = [];
        }

        errors.push({ 'message': ex.message, 'stack': ex.stack });
    },

    flush: function() {
        let log = getLog();
        print(log);
    },

    writeNoRequest: function(value) {
        print(value);
    },

    requestId: function() {
        let log = getLog();
        return log.requestID;
    },

    verbose: VERBOSE,
    sourceName: SOURCENAME
};
