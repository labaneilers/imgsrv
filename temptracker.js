'use strict';

const fs = require('fs');
const util = require('util');
const unlink = util.promisify(fs.unlink);

class TempTracker {
    constructor() {
        this.files = [];
    }

    add(file) {
        this.files.push(file);
    }

    async cleanup() {
        var tasks = this.files.map(async f => {
            try {
                return await unlink(f);
            } catch (ex) {
                if (ex.code != "ENOENT") {
                    console.log(ex);
                }
            }
        });
        await Promise.all(tasks);
    }
}

module.exports.TempTracker = TempTracker;