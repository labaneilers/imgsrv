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
                    result[item.toLowerCase()] = true;
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
            let sourceHost = url.parse(uri).host.toLowerCase();
            if (!this.domainWhitelist[sourceHost]) {
                throw new Error(`Domain not whitelisted: ${sourceHost}`);
            }
        }
    }
}

module.exports.DomainWhitelist = DomainWhitelist;