'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');
const uuid = require('uuid/v4');
const unlink = util.promisify(fs.unlink);

class TempTracker {
    constructor(tempDir) {
        this.files = [];
        this.tempDir = tempDir;
    }

    add(file) {
        this.files.push(file);
    }

    create(ext) {
        let tempFile = `${this.tempDir}/${uuid()}.${ext}`;
        tempFile = path.normalize(tempFile);

        this.add(tempFile);
        return tempFile;
    }

    async cleanup() {
        let tasks = this.files.map(async f => {
            try {
                await unlink(f);
            } catch (ex) {
                if (ex.code != 'ENOENT') {
                    console.log(ex);
                }
            }
        });
        await Promise.all(tasks);
    }
}

module.exports.TempTracker = TempTracker;