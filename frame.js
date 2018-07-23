'use strict';

async function write(hostname, imagePath, request, response, next) {

    let optimizedUri = new URL(imagePath, hostname);
    optimizedUri.searchParams.delete('jp2');
    optimizedUri.searchParams.delete('jxr');
    optimizedUri.searchParams.delete('webp');

    let accept = (request.headers['accept'] || '').split(',');
    let ua = request.headers['user-agent'] || '';

    if (accept.indexOf('image/webp') >= 0) {
        optimizedUri.searchParams.set('webp', '1');
    } else if (accept.indexOf('image/jxr') >= 0) {
        optimizedUri.searchParams.set('jxr', '1');
    } else if (ua.indexOf('Safari') >= 0) {
        let match = ua.match(/Version\/(\d+)/);
        let version = parseInt(match[1]) || 0;
        if (version >= 6) {
            optimizedUri.searchParams.set('jp2', '1');
        }
    }

    response.send(`<html><head><title>Optimized Image</title></head><body><div>${optimizedUri}</div><div>${accept}</div><img src="${optimizedUri.toString()}" /></body></html>`);
}

exports.write = write;