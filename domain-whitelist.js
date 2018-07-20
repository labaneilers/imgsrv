'use strict';

const url = require('url');

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
    printStatus(stream) {
        if (this.domainWhitelist) {
            stream.write('Whitelisting domains:\n');
            Object.keys(this.domainWhitelist).forEach(d => stream.write(`  -  ${d}\n`));
        } else {
            stream.write('WARNING: No domain whitelist specified: allowing ALL domains\n');
        }
    }

    // Checks the specified URI against the whitelist, throws an error if the domain (hostname) is not whitelisted
    validate(uri) {
        if (this.domainWhitelist) {
            let sourceHost = url.parse(uri).host.toLowerCase();
            if (!this.domainWhitelist[sourceHost]) {
                throw new Error(`Domain not whitelisted: ${sourceHost}`)
            }
        }
    }
}

module.exports.DomainWhitelist = DomainWhitelist;