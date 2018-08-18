'use strict';

const url = require('url');
const log = require('./logger');

// A whitelist of allowed domains for source images
class DomainWhitelist {

    constructor(domainEnv) {
        this.domainWhitelist = null;

        if (domainEnv) {
            this.domainWhitelist = process.env.IMGSRV_DOMAINS
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
        if (this.domainWhitelist) {
            return this.domainWhitelist;
        } else {
            return { warning: 'No domain whitelist specified: allowing ALL domains' };
        }
    }

    // Checks the specified URI against the whitelist, throws an error if the domain (hostname) is not whitelisted
    validate(uri) {
        if (this.domainWhitelist) {
            let parsed = url.parse(uri);
            let sourceHost = parsed.host.toLowerCase();

            let wlItem = this.domainWhitelist[sourceHost];
            if (!wlItem) {
                throw new Error(`Domain not whitelisted: ${sourceHost}`);
            } else if (wlItem.__hasPaths) {

                let dirs = parsed.path.toLowerCase()
                    .substr(1)
                    .split('/');
                let i = 0;

                while (wlItem.__hasPaths && i < dirs.length) {
                    let nextItem = wlItem[dirs[i]];
                    if (!nextItem) {
                        throw new Error(`Domain whitelisted, but missing segment: ${dirs[i]}`);
                    }
                    wlItem = nextItem;
                    i++;
                }    
            }
        }
    }
}

module.exports.DomainWhitelist = DomainWhitelist;