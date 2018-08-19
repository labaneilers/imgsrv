'use strict';

const url = require('url');
const log = require('./logger');

// A whitelist of allowed domains for source images
class OriginWhitelist {

    constructor(domainEnv) {
        this.originWhitelist = null;

        if (domainEnv) {
            this.originWhitelist = process.env.IMGSRV_ORIGIN_WHITELIST
                .split(',')
                .reduce((result, item) => {
                    let segments = item.split('/');
                    let lastSegment = result[segments[0].toLowerCase()] = {};
                    for (let i = 1; i<segments.length; i++) {
                        lastSegment.__hasPaths = true;
                        lastSegment = lastSegment[segments[i].toLowerCase()] = {};
                    }
                    return result;
                    }, {});
        }
    }

    // Emits status to console
    getStatus() {
        if (this.originWhitelist) {
            return this.originWhitelist;
        } else {
            return { warning: 'No origin whitelist specified: allowing ALL origins' };
        }
    }

    // Checks the specified URI against the whitelist, throws an error if the origin is not whitelisted
    validate(uri) {
        if (this.originWhitelist) {
            let parsed = url.parse(uri);
            let sourceHost = parsed.host.toLowerCase();

            let wlItem = this.originWhitelist[sourceHost];
            if (!wlItem) {
                throw new Error(`Origin not whitelisted: ${sourceHost}`);
            } else if (wlItem.__hasPaths) {

                let dirs = parsed.path.toLowerCase()
                    .substr(1)
                    .split('/');
                let i = 0;

                while (wlItem.__hasPaths && i < dirs.length) {
                    let nextItem = wlItem[dirs[i]];
                    if (!nextItem) {
                        throw new Error(`Origin whitelisted, but missing segment: ${dirs[i]}`);
                    }
                    wlItem = nextItem;
                    i++;
                }
            }
        }
    }
}

module.exports.OriginWhitelist = OriginWhitelist;