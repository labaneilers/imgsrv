# ImgSrv
A proxy server which optimizes and resizes images. 

## How it works

For any source image, several different compression types are compared in a bake off. The smallest file is served. The formats include:

* JPEG: Uses https://github.com/tjko/jpegoptim
* PNG: Uses https://pngquant.org/
* WebP: Uses https://developers.google.com/speed/webp/docs/cwebp
* Jpeg2000: Uses https://www.imagemagick.org/script/index.php
* JpegXR: Uses https://github.com/4creators/jxrlib

Note the two of these formats are not supported in all browsers:

* WebP: Works in Chrome and other Chromium-based browsers, including on Android
* Jpeg2000: Works in Safari, including in iOS
* JpegXR: Works in IE and Edge

Since the size savings for these formats is significant, it is worth it for pages using this service to indicate (via the imgsrv URL) that the browser supports one of these formats. 

## Usage

```
http://localhost:56789/?w={width}&webp={1 if webp}&jp2={1 if jpeg 2000}&u={source image uri}
```

## Detection

There are two ways to serve images with the correct parameters for the supported image formats:

1. The PICTURE HTML element: http://www.useragentman.com/blog/2015/01/14/using-webp-jpeg2000-jpegxr-apng-now-with-picturefill-and-modernizr/
2. Server side feature detection: Detect on the server side and construct URLs when you render IMG tags. https://blog.elijaa.org/2016/01/29/detect-webp-jpeg2000-jpegxr-image-format-support-in-php/

## Example source images

* JPEG (photo with flat areas): https://upload.wikimedia.org/wikipedia/commons/b/bb/Pickle.jpg
* JPEG (illustration): https://upload.wikimedia.org/wikipedia/commons/f/fd/Lend_To_Defend_his_Right_to_be_Free_poster_by_Tom_Purvis.jpg
* PNG (Photo): https://www.vistaprint.com/merch/www/mc/legacy/images/vp-site/vhp/marquee/BasicMarqueeA/GL-outdoor-signage-001-2x-hccd3814da8fbc9167eef977d96ab455e7.png
* PNG (Transparent): https://upload.wikimedia.org/wikipedia/commons/5/5c/Mozilla_dinosaur_head_logo.png
* PNG (Transparent, flat): https://www.iconspng.com/uploads/office-executive-man-flat-design/office-executive-man-flat-design.png

### JXR examples:
http://localhost:56789/?u=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fb%2Fbb%2FPickle.jpg&w=1200&jxr=1
http://localhost:56789/?u=https://www.vistaprint.com/merch/www/mc/legacy/images/vp-site/vhp/marquee/BasicMarqueeA/GL-outdoor-signage-001-2x-hccd3814da8fbc9167eef977d96ab455e7.png&w=1200&jxr=1

## TODO
* Pass in a list of whitelisted domains as an ENV variable
* Logging strategy
* Check if the raw image source is already the right size and skip resizing
* Short circuit creating a PNG when the source image is a JPG- it will be unlikely to work.


