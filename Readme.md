# ImgSrv
A proxy server which optimizes and resizes images. 

## How it works

For any source image, several different compression types are compared in a bake off. The smallest file is served. The formats include:

* JPEG: Uses https://github.com/tjko/jpegoptim
* PNG: Uses https://pngquant.org/
* WebP: Uses https://developers.google.com/speed/webp/docs/cwebp
* Jpeg2000: Uses https://www.imagemagick.org/script/index.php

Note the two of these formats are not supported in all browsers:

* WebP: Works in Chrome and other Chromium-based browsers, including on Android
* Jpeg2000: Works in Safari, including in iOS

Since the size savings for these formats is significant, it is worth it for pages using this service to indicate (via the imgsrv URL) that the browser supports one of these formats. 

## Usage

```
http://localhost:56789/?w={width}&webp={1 if webp}&jp2={1 if jpeg 2000}&u={source image uri}
```

## Example source images

* JPEG (photo with flat areas): https://upload.wikimedia.org/wikipedia/commons/b/bb/Pickle.jpg
* JPEG (illustration): https://upload.wikimedia.org/wikipedia/commons/f/fd/Lend_To_Defend_his_Right_to_be_Free_poster_by_Tom_Purvis.jpg
* PNG (Photo): https://www.vistaprint.com/merch/www/mc/legacy/images/vp-site/vhp/marquee/BasicMarqueeA/GL-outdoor-signage-001-2x-hccd3814da8fbc9167eef977d96ab455e7.png
* PNG (Transparent): https://upload.wikimedia.org/wikipedia/commons/5/5c/Mozilla_dinosaur_head_logo.png

## TODO
* Force order of parameters with redirect to optimize cache
* Pass in a list of whitelisted domains as an ENV variable
* Logging strategy
