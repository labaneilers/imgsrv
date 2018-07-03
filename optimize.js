const path = require('path');
const fs = require('fs');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const execAsync = util.promisify(require('child_process').exec);
const exec = function(cmd) {
    execSync(cmd, {stdio:[0,1,2]});
}

var listFiles = async function(dir, filelist) {
    let files = await readdir(dir);
    filelist = filelist || [];
    files.forEach(async function(file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = await listFiles(path.join(dir, file), filelist);
        }
        else {
            filelist.push(path.join(dir, file));
        }
    });
    return filelist;
};

var imageSize = async function(path) {
    var size = await execAsync("identify -format '%wx%h' " + path);
    var sizeArr = size.stdout.replace(/'/gi, '').split('x');
    return {
        width: parseInt(sizeArr[0]),
        height: parseInt(sizeArr[1])
    };
};

var fileSize = async function(filename) {
    const stats = await stat(filename);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
};

var get1xName = function(path) {
    return path.replace("-2x.", "-1x.");
};

var getFileWithFileSize = async function(file) {
    return {
        path: file,
        fileSize: await fileSize(file) 
    };
};

var getFileSizes = async function(files) {
    return files
        .map(await getFileWithFileSize)
        .sort((a, b) => a.fileSize - b.fileSize);
};

var getOptimizationOverview = function(originalFile, newFiles, webpFile, jpeg2000File) {
    var ret = {
        originalFile: getFileWithFileSize(originalFile),
        newFiles: getFileSizes(newFiles),
        webpFile: getFileWithFileSize(webpFile),
        jpeg2000File: getFileWithFileSize(jpeg2000File)
    };

    ret.best = ret.newFiles[0];
    ret.changedFormat = path.extname(ret.best.path) != path.extname(ret.originalFile.path);
    ret.savings = ret.originalFile.fileSize - ret.best.fileSize;
    ret.webpSavings = ret.best.fileSize - ret.webpFile.fileSize;
    ret.jpeg2000Savings = ret.best.fileSize - ret.jpeg2000File.fileSize;

    return ret;
};

var renderOptimizationSummary = function(summary) {
    var changedFormat = summary.changedFormat ? "CHANGED to " + path.extname(summary.best.path) : "";
    console.log(summary.originalFile.path + ":");
    if (changedFormat) {
        console.log("    " + changedFormat);
    }
    console.log("    new: " + summary.best.path);
    console.log("    saved: " + summary.savings + " bytes");
    if (summary.webpSavings > 0) {
        console.log("    webp saves additional: " + summary.webpSavings + " bytes")
    }
    if (summary.jpeg2000Savings > 0) {
        console.log("    jpeg2000 saves additional: " + summary.jpeg2000Savings + " bytes")
    }
};

var buildOptMapSummaryEntry = function(summary) {
    return {
        all: summary.best.path,
        webp: summary.webpSavings > 0 ? summary.webpFile.path : summary.best.path,
        jpeg2000: summary.jpeg2000Savings > 0 ? summary.jpeg2000File.path : summary.best.path
    };
};

var buildOptMapEntry = function(oneXSummary, twoXSummary) {
    return {
       oneX: buildOptMapSummaryEntry(oneXSummary),
       twoX: buildOptMapSummaryEntry(twoXSummary),
    };
};

async function getFileProps(file) {
    var fileData = {
        path: file,
        size: await imageSize(file),
        ext: path.extname(file)
    };

    if (fileData.is2x) {
        fileData.size1x = {
            width: fileData.size.width / 2,
            height: fileData.size.height / 2
        };
    }

    return fileData;
}

async function optimize(filePath, width) {

    let file = await getFileProps(filePath);

    let srcJpg = null;
    let srcPng = null;
    let targetJpg = file.path + ".opt.jpg";
    let targetPng = file.path + ".opt.png";

    if (file.ext == ".png") {
        srcJpg = file.path + ".hiq.jpg"
        srcPng = file.path + ".hiq.png";
        await execAsync('convert "' + file.path + '" -resize ' + width + ' "' + srcPng + '"');
    } else if (file.ext == ".jpg") {
        srcJpg = file.path;
    }

    await execAsync('convert "' + file.path + '" -quality 100 -resize ' + width + ' "' + srcJpg + '"');
    await execAsync('jpegoptim -m80 --strip-all --stdout --quiet "' + srcJpg + '" > "' + targetJpg + '"');
    await execAsync('pngquant --force --quality=65-80 "' + srcPng + '" --output "' + targetPng + '"');

    var jpgSize = await fileSize(targetJpg);
    var pngSize = await fileSize(targetPng);

    if (jpgSize < pngSize) {
        return {
            path: targetJpg,
            fileSize: jpgSize
        };
    }
    else
    {
        return {
            path: targetPng,
            fileSize: pngSize
        };
    }
}

// files
//     .filter(file => file.is2x)
//     .forEach(file => {
//         if (file.ext == ".png") {
//             var twoXHighQualtiyJpgName = file.path + ".hiq.jpg";
//             var oneXHighQualtiyJpgName = get1xName(file.path) + ".hiq.jpg";
//             var twoXCompressedJpgName = file.path + ".opt.jpg";
//             var oneXCompressedJpgName = get1xName(file.path) + ".opt.jpg";
//             var twoXHighQualityPNGName = file.path;
//             var oneXHighQualityPNGName = get1xName(file.path) + ".hiq.png";
//             var twoXCompressedPNGName = file.path + ".opt.png";
//             var oneXCompressedPNGName = get1xName(file.path) + ".opt.png";
//             var twoXWebPName = file.path + ".webp";
//             var oneXWebPName = get1xName(file.path) + ".webp";
//             var twoXJpeg2000Name = file.path + ".jp2";
//             var oneXJpeg2000Name = get1xName(file.path) + ".jp2";

//             // High-quality, uncompressed
//             exec('convert "' + twoXHighQualityPNGName + '" -quality 100 "' + twoXHighQualtiyJpgName + '"');
//             exec('convert "' + twoXHighQualityPNGName + '" -quality 100 -resize 50% "' + oneXHighQualtiyJpgName + '"');
//             exec('convert "' + twoXHighQualityPNGName + '" -resize 50% "' + oneXHighQualityPNGName + '"');

//             // JPEG
//             exec('jpegoptim -m80 --strip-all --stdout --quiet "' + twoXHighQualtiyJpgName + '" > "' + twoXCompressedJpgName + '"');
//             exec('jpegoptim -m80 --strip-all --stdout --quiet "' + oneXHighQualtiyJpgName + '" > "' + oneXCompressedJpgName + '"');

//             // PNG
//             exec('pngquant --force --quality=65-80 "' + twoXHighQualityPNGName + '" --output "' + twoXCompressedPNGName + '"');
//             exec('pngquant --force --quality=65-80 "' + oneXHighQualityPNGName + '" --output "' + oneXCompressedPNGName + '"');

//             // Webp
//             exec('cwebp -quiet -q 80 "' + twoXHighQualityPNGName + '" -o "' + twoXWebPName + '"');
//             exec('cwebp -quiet -q 80 "' + oneXHighQualityPNGName + '" -o "' + oneXWebPName + '"');
            
//             // JPEG 2000
//             exec('convert "' + twoXHighQualityPNGName + '" -format jp2 -define jp2:rate=32 "' + twoXJpeg2000Name + '"');
//             exec('convert "' + oneXHighQualityPNGName + '" -format jp2 -define jp2:rate=32 "' + oneXJpeg2000Name + '"');

//             // Output summary
//             var twoXSummary = getOptimizationOverview(
//                 twoXHighQualityPNGName, 
//                 [ twoXCompressedJpgName, twoXCompressedPNGName ], 
//                 twoXWebPName, 
//                 twoXJpeg2000Name);
//             renderOptimizationSummary(twoXSummary);
            

//             var oneXSummary = getOptimizationOverview(
//                 oneXHighQualityPNGName, 
//                 [ oneXCompressedJpgName, oneXCompressedPNGName ], 
//                 oneXWebPName, 
//                 oneXJpeg2000Name);
//             renderOptimizationSummary(oneXSummary);

//             optMap[file.path] = buildOptMapEntry(oneXSummary, twoXSummary);
//         }
//     });

// //fs.writeFileSync("summary.json", JSON.stringify(optMap, null, 4));

exports.imageSize = imageSize;
exports.fileSize = fileSize;
exports.optimize = optimize;

