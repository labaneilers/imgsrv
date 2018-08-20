# ImgSrv
ImgSrv is a proxy server which optimizes and resizes images, and supports several browser-specific formats. This can be used to reduce the size of images across your site by 40-50%.  

## How it works

For any source image, several different compression types are compared in a bake off. The smallest file is served. The formats include:

* JPEG: Uses https://github.com/tjko/jpegoptim
* PNG: Uses https://pngquant.org/
* WebP: Uses https://developers.google.com/speed/webp/docs/cwebp
* Jpeg2000: Uses https://www.imagemagick.org/script/index.php
* JpegXR: Uses https://github.com/4creators/jxrlib

Note that two of these formats are not supported in all browsers:

* WebP: Works in Chrome and other Chromium-based browsers, including on Android
* Jpeg2000: Works in Safari, including in iOS
* JpegXR: Works in IE and Edge

Since the size savings for these formats is significant, it is worth it for pages using this service to indicate (via the imgsrv URL) that the browser supports one of these formats. 

## Usage

The format for an ImgSrv URL is as follows:

```
http://{imgsrv hostname}/?u={source image uri}&w={width}&webp={1 if webp}&jp2={1 if jpeg 2000}
```

For example, for the original image:

```
https://www.somedomain.com/images/foo.png
```

Rewrite the URL as such:

```
http://my-imgsrv-instance.somedomain.com/?u=https%3A%2F%2Fwww.somedomain.com%2Fimages%2Ffoo.png&w=500
```

### Parameter order and encoding

In order to ensure maximal cacheablity, ImgSrv enforces the order and encoding of querystring parameters. It will respond with a 500 error for requests that don't have the correct order or encoding. 

The order of parameters is:

1. ```u```: The origin URL. Must be URL encoded (e.g. via ```encodeURIComponent()```)
2. ```w```: Width.
3. ```webp```, ```jxr```, or ```jp2``` (based on browser support)

## Using browser-specific formats

To take full advantage of ImgSrv, you would configure your URL generation code to add an additional querystring parameter for specific formats, based on accept header/browser support.

There are two ways to serve images with the correct parameters for the supported image formats:

1. The PICTURE HTML element
2. Server side feature detection

### 1. The PICTURE HTML element

More information: 

* http://www.useragentman.com/blog/2015/01/14/using-webp-jpeg2000-jpegxr-apng-now-with-picturefill-and-modernizr/
* http://scottjehl.github.io/picturefill/

```html
<picture>
  <source srcset="http://my-imgsrv-instance.somedomain.com/?u=https%3A%2F%2Fwww.somedomain.com%2Fimages%2Ffoo.png&w=500&webp=1 1x, http://my-imgsrv-instance.somedomain.com/?u=https%3A%2F%2Fwww.somedomain.com%2Fimages%2Ffoo.png&w=1000&webp=1 2x" type="image/webp">
  <source srcset="http://my-imgsrv-instance.somedomain.com/?u=https%3A%2F%2Fwww.somedomain.com%2Fimages%2Ffoo.png&w=500&jxr=1 1x, http://my-imgsrv-instance.somedomain.com/?u=https%3A%2F%2Fwww.somedomain.com%2Fimages%2Ffoo.png&w=1000&jxr=1 2x" type="image/vnd.ms-photo">
  <source srcset="http://my-imgsrv-instance.somedomain.com/?u=https%3A%2F%2Fwww.somedomain.com%2Fimages%2Ffoo.png&w=500&jp2=1 1x, http://my-imgsrv-instance.somedomain.com/?u=https%3A%2F%2Fwww.somedomain.com%2Fimages%2Ffoo.png&w=1000&jp2=1 2x" type="image/jp2">
  <img src="http://my-imgsrv-instance.somedomain.com/?u=https%3A%2F%2Fwww.somedomain.com%2Fimages%2Ffoo.png&w=500">
</picture>
```

### 2. Server side feature detection

Given the complexity and size of the picture element, it may be desirable to generate URLs server side and render IMG tags with the ```srcset``` attribute. 

Here's example server-side URL generation code for a node.js application:

```javascript
function getUrl(originalUrl, width) {
    let qs = new URLSearchParams();

    qs.set(u, originalUrl);
    qs.set(w, width);

    // Detect webp and jpegXR support via accept headers
    let accept = (request.headers['accept'] || '').split(',');

    // Detect jpeg2000 support via user-agent
    let ua = request.headers['user-agent'] || '';

    if (accept.indexOf('image/webp') >= 0) {
        qs.set('webp', '1');
    } else if (accept.indexOf('image/jxr') >= 0) {
        qs.set('jxr', '1');
    } else if (ua.indexOf('Safari') >= 0) {

        // Safari version 6+ supports jpeg2000
        let match = ua.match(/Version\/(\d+)/);
        let version = parseInt(match[1]) || 0;
        if (version >= 6) {
            qs.set('jp2', '1');
        }
    }

    return IMGSRV_HOST + '/?' + qs.toString();
}
```

Use these URLs to emit IMG tags in this form:

```html
<img srcset="http://my-imgsrv-instance.somedomain.com/?u=https%3A%2F%2Fwww.somedomain.com%2Fimages%2Ffoo.png&w=500&webp=1 1x, http://my-imgsrv-instance.somedomain.com/?u=https%3A%2F%2Fwww.somedomain.com%2Fimages%2Ffoo.png&w=1000&webp=1 2x">
```

Note that you could also use a function (like the one above) to generate these URLs client-side (e.g. via React components).

## Deployment

### Docker container
ImgSrv was designed to be deployed as a docker container. To build it, use:

```
docker build . -t imgsrv
```

### Caching
ImgSrv is designed to produce the smallest possible image, and NOT designed to run quickly enough to support real-time requests. It has NO internal caching features. As such, **it is essential that you deploy ImgSrv behind a caching proxy or CDN** (e.g. Squid, AWS CloudFront, Akamai, or CloudFlare). ImgSrv can take multiple seconds to render images, so caching results is critical.

ImgSrv emits cache-control headers to cache images for 1 year, so it is also recommended you treat image URLs as immutable.

## Configuration

### Temp directory
ImgSrv uses ImageMagick internally to convert and compress images, and writes temporary image files to the file system. By default, this is written to the directory ```/server/tmp``` (the node.js app root is ```/server```). You can override this with the environment variable ```IMGSRV_TEMP```:

```
IMGSRV_TEMP=/mnt/temp
```

Note: When running ImgSrv in production (e.g. in Kubernetes), it is recommended you put the temp directory on a fast mounted volume, such as a ramdisk.

### Origin whitelist
Setting an origin whitelist prevents use of ImgSrv to proxy images from origins that aren't yours. Use the environment variable ```IMGSRV_ORIGIN_WHITELIST``` to specify an origin whitelist:

```
IMGSRV_ORIGIN_WHITELIST=www.vistaprint.com,s3-eu-west-1.amazonaws.com/sitecore-media-bucket
```

### Logging
ImgSrv writes JSON logs to stdout/stderr. By default, only requests with errors are logged, but you can configure it to write more detailed information about requests with the following environment variables:

```
IMGSRV_VERBOSE=1
```

By default, JSON logs are single line, but for ease of debugging, you can configure them to be indented:

```
IMGSRV_LOG_INDENT=1
```

### Application Performance Monitoring

ImgSrv can be monitored via NewRelic. To enable, set the environment variable ```NEWRELIC_LICENSE_KEY``` to your NewRelic license.

### Request IDs
Each request has a requestID, which appears in the logs in the field ```requestID```, and also in an HTTP header ```X-RequestID```. For requests that error, the requestID is emitted in the response body.

### Origin timeout

The timeout for an origin image is set to 10 seconds by default. You can override it with: 

```
IMGSRV_ORIGIN_TIMEOUT=5000
```

## Development

Installing the dependencies for ImgSrv are a bit tricky, so it is recommended to do local development with the docker container. Use docker compose to launch the debug configuration of ImgSrv (e.g. which uses nodemon for auto-reloading):

```
docker-compose up debug
```

You can then attach a debugger (e.g. using the included Visual Studio Code launchSettings.json).

## Example source images

* JPEG (photo with flat areas): https://upload.wikimedia.org/wikipedia/commons/b/bb/Pickle.jpg
* JPEG (illustration): https://upload.wikimedia.org/wikipedia/commons/f/fd/Lend_To_Defend_his_Right_to_be_Free_poster_by_Tom_Purvis.jpg
* PNG (Photo): https://www.vistaprint.com/merch/www/mc/legacy/images/vp-site/vhp/marquee/BasicMarqueeA/GL-outdoor-signage-001-2x-hccd3814da8fbc9167eef977d96ab455e7.png
* PNG (Transparent): https://upload.wikimedia.org/wikipedia/commons/5/5c/Mozilla_dinosaur_head_logo.png
* PNG (Transparent, flat): https://www.iconspng.com/uploads/office-executive-man-flat-design/office-executive-man-flat-design.png

### JXR examples:
http://localhost:56789/?u=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fb%2Fbb%2FPickle.jpg&w=1200&jxr=1
http://localhost:56789/?u=https://www.vistaprint.com/merch/www/mc/legacy/images/vp-site/vhp/marquee/BasicMarqueeA/GL-outdoor-signage-001-2x-hccd3814da8fbc9167eef977d96ab455e7.png&w=1200&jxr=1


