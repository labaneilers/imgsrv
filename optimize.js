const path = require('path');
const fs = require('fs');
const util = require('util');
const stat = util.promisify(fs.stat);
const execAsync = util.promisify(require('child_process').exec);

const getImageSize = async function(path) {
    let size = await execAsync("identify -format '%wx%h' " + path);
    let sizeArr = size.stdout.replace(/'/gi, '').split('x');
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
    var fileData = {
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

// TODO: class to allocate temp files that can then be cleaned up

const createHighQualitySrc = async function(file, width) {
    let hqPng = file.path + ".hiq.png";
    let hqJpg = file.path + ".hiq.jpg";

    // TODO: Check if src is already the right size and skip
    // TODO: Should we skip creating a png here if the source is JPG?
    console.log("resize png: " + hqPng);
    var pngTask = execAsync('convert "' + file.path + '" -resize ' + width + ' "' + hqPng + '"');

    console.log("resize jpg: " + hqJpg);
    var jpgTask = execAsync('convert "' + file.path + '" -quality 100 -resize ' + width + ' "' + hqJpg + '"');

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

const optPng = async function(srcPng) {
    let target = srcPng.replace('.hiq.png', '.opt.png');

    console.log("generating png: " + target);
    try {
        await execAsync('pngquant --force --quality=65-80 "' + srcPng + '" --output "' + target + '"');
        let fileSize = await getFileSize(target);

        return {
            path: target,
            fileSize: fileSize,
            type: 'png'
        };

    } catch (ex) {
        console.log("pngquant failed: probably a photo");
        return EMPTY_RESULT;
    }
};

const optJpg = async function(srcJpg) {
    let target = srcJpg.replace('.hiq.jpg', '.opt.jpg');

    console.log("generating jpg: " + target);
    await execAsync('jpegoptim -m80 --strip-all --stdout --quiet "' + srcJpg + '" > "' + target + '"');

    let fileSize = await getFileSize(target);

    return {
        path: target,
        fileSize: fileSize,
        type: 'jpg'
    };
};

const optJp2 = async function(srcJpg) {
    let target = srcJpg.replace('.hiq.jpg', '.opt.jp2');

    console.log("generating jp2: " + target);
    await execAsync('convert "' + srcJpg + '" -format jp2 -define jp2:rate=32 "' + target + '"');

    let fileSize = await getFileSize(target);

    return {
        path: target,
        fileSize: fileSize,
        type: 'jp2'
    };
};

const optWebp = async function(src) {
    let target = src.replace('.hiq.png', '.opt.webp');

    console.log("generating webp: " + target);
    await execAsync('cwebp -quiet -q 80 "' + src + '" -o "' + target + '"');

    let fileSize = await getFileSize(target);

    return {
        path: target,
        fileSize: fileSize,
        type: 'webp'
    };
};

const optimize = async function(filePath, width, allowWebp, allowJp2) {

    let file = await getFileProps(filePath);

    console.log("input format: " + file.ext);

    let hqSrc = await createHighQualitySrc(file, width);

    let pngTask = file.ext == ".png" ? optPng(hqSrc.png) : Promise.resolve(EMPTY_RESULT);
    let jpgTask = optJpg(hqSrc.jpg);
    let webpTask = allowWebp ? optWebp(hqSrc.png || hqSrc.jpg) : Promise.resolve(EMPTY_RESULT);
    let jp2Task = allowJp2 ? optJp2(hqSrc.jpg) : Promise.resolve(EMPTY_RESULT);

    let [pngOutput, jpgOutput, webpOutput, jp2Output] = 
        await Promise.all([ pngTask, jpgTask, webpTask, jp2Task]);
    
    // Sort results by file size
    let allOutput = [pngOutput, jpgOutput, webpOutput, jp2Output]
        .filter(o => o.type);
    allOutput.sort((a, b) => a.fileSize - b.fileSize);

    allOutput.forEach(o => {
        console.log(`${o.type}: ${o.fileSize}`);
    });

    return allOutput[0];
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

exports.getImageSize = getImageSize;
exports.getFileSize = getFileSize;
exports.optimize = optimize;

