'use strict';

const httpContext = require('express-http-context');

const getLog = function() {
    let log = httpContext.get('log');
    if (!log) {
        log = {};
        httpContext.set('log', log);
    }
    return log;
};

let indent = null;
if (process.env.IMGSRV_LOG_INDENT) {
    indent = '  ';
}

const VERBOSE = process.env.IMGSRV_VERBOSE == '1';

const print = function(obj) {
    let data = JSON.stringify(obj, null, indent);
    if (obj.errors) {
        console.error(data);
    } else if (VERBOSE) {
        console.log(data);
    }
};

module.exports = {
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

    verbose: VERBOSE
};
