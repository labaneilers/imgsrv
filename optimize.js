'use strict';

const path = require('path');
const fs = require('fs');
const util = require('util');
const stat = util.promisify(fs.stat);
const execAsync = util.promisify(require('child_process').exec);
const log = require('./logger');

const getImageSize = async function(path) {
    let size = await execAsync(`identify -format '%wx%h' ${path}`);
    // NOTE: Normally child_process.exec is supposed to return stdout as a string,
    // it is interacting with newrelic and util.promisify so that an object
    // is being returned with stdout and stderr properties.
    let sizeArr = (size.stdout || size).replace(/'/gi, '').split('x');
    return {
        width: parseInt(sizeArr[0]),
        height: parseInt(sizeArr[1])
    };
};

const getFileSize = async function(filename) {
    let stats = await stat(filename);
    let fileSizeInBytes = stats.size;
    return fileSizeInBytes;
};

const getFileProps = async function (file) {
    let fileData = {
        path: file,
        size: await getImageSize(file),
        ext: path.extname(file)
    };

    if (fileData.is2x) {
        fileData.size1x = {
            width: fileData.size.width / 2,
            height: fileData.size.height / 2
        };
    }

    return fileData;
};

const createHighQualitySrc = async function(file, width, tempTracker) {
    let hqPng = file.path + '.hiq.png';
    let hqJpg = file.path + '.hiq.jpg';

    tempTracker.add(hqPng);
    tempTracker.add(hqJpg);

    // TODO: Check if src is already the right size and skip
    // TODO: Should we skip creating a png here if the source is JPG?
    log.write('resizePng', hqPng);
    let pngTask = execAsync(`convert "${file.path}" -resize ${width} "${hqPng}"`);

    log.write('resizeJpg', hqJpg);
    let jpgTask = execAsync(`convert "${file.path}" -quality 100 -resize ${width} "${hqJpg}"`);

    await Promise.all([ pngTask, jpgTask ]);

    return {
        png: hqPng,
        jpg: hqJpg
    };
};

const EMPTY_RESULT = {
    path: null,
    fileSize: Number.MAX_SAFE_INTEGER
};

const optCommand = async function(srcPath, srcExt, targetExt, createCommand, handleError, tempTracker) {
    let target = srcPath.replace('.hiq.' + srcExt, '.opt.' + targetExt);
    tempTracker.add(target);

    //log.write(`generating ${targetExt}: ` + target);
    try {
        await execAsync(createCommand(srcPath, target));
        let fileSize = await getFileSize(target);

        return {
            path: target,
            fileSize: fileSize,
            type: targetExt,
            mimeType: 'image/' + targetExt
        };

    } catch (ex) {
        handleError(ex);
        return EMPTY_RESULT;
    }
};

const optPng = async function(srcPath, tempTracker) {
    return await optCommand(
        srcPath,
        'png',
        'png',
        (src, target) => `pngquant --force --quality=65-80 "${src}" --output "${target}"`,
        ex => log.warning('pngquant failed: probably a photo'),
        tempTracker
    );
};

const optJpg = async function(srcPath, tempTracker) {
    return await optCommand(
        srcPath,
        'jpg',
        'jpg',
        (src, target) => `jpegoptim -m80 --strip-all --stdout --quiet "${src}" > "${target}"`,
        ex => { throw ex; },
        tempTracker
    );
};

const optJp2 = async function(srcPath, tempTracker) {
    return await optCommand(
        srcPath,
        'jpg',
        'jp2',
        (src, target) => `convert "${src}" -format jp2 -define jp2:rate=32 "${target}"`,
        ex => { throw ex; },
        tempTracker
    );
};

const optWebp = async function(srcPath, tempTracker) {
    return await optCommand(
        srcPath,
        'png',
        'webp',
        (src, target) => `cwebp -quiet -q 80 "${src}" -o "${target}"`,
        ex => { throw ex; },
        tempTracker
    );
};

const optJxr = async function(srcPath, tempTracker) {

    let bmpPath = srcPath.replace('.hiq.png', '.hiq.bmp');
    tempTracker.add(bmpPath);
    await execAsync(`convert "${srcPath}" -alpha off -colorspace RGB "${bmpPath}"`);

    let optimized = await optCommand(
        srcPath,
        'png',
        'jxr',
        (src, target) => `JxrEncApp -i "${bmpPath}" -o "${target}" -q 0.4`,
        ex => { throw ex; },
        tempTracker
    );

    optimized.mimeType = 'image/vnd.ms-photo'; // Wacky mime type: image/jxr doesn't work in IE

    return optimized;
};

const optimize = async function(filePath, width, allowWebp, allowJp2, allowJxr, tempTracker) {

    let file = await getFileProps(filePath);

    log.write('inputFormat', file.ext);

    let hqSrc = await createHighQualitySrc(file, width, tempTracker);
    let empty = Promise.resolve(EMPTY_RESULT);

    let pngTask = file.ext == '.png' ? optPng(hqSrc.png, tempTracker) : empty;
    let jpgTask = optJpg(hqSrc.jpg, tempTracker);
    let webpTask = allowWebp ? optWebp(hqSrc.png || hqSrc.jpg, tempTracker) : empty;
    let jp2Task = allowJp2 ? optJp2(hqSrc.jpg, tempTracker) : empty;
    let jxrTask = allowJxr ? optJxr(hqSrc.png, tempTracker) : empty;

    let [pngOutput, jpgOutput, webpOutput, jp2Output, jxrOutput] =
        await Promise.all([ pngTask, jpgTask, webpTask, jp2Task, jxrTask]);

    // Sort results by file size
    let allOutput = [pngOutput, jpgOutput, webpOutput, jp2Output, jxrOutput]
        .filter(o => o.type);
    allOutput.sort((a, b) => a.fileSize - b.fileSize);

    log.write('candidates', allOutput);

    return allOutput[0];
};

exports.optimize = optimize;

