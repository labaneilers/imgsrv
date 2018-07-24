'use strict';

async function write(request, response, next) {

    let qs = new URLSearchParams(request.query);
    qs.delete('jp2');
    qs.delete('jxr');
    qs.delete('webp');

    let accept = (request.headers['accept'] || '').split(',');
    let ua = request.headers['user-agent'] || '';

    if (accept.indexOf('image/webp') >= 0) {
        qs.set('webp', '1');
    } else if (accept.indexOf('image/jxr') >= 0) {
        qs.set('jxr', '1');
    } else if (ua.indexOf('Safari') >= 0) {
        let match = ua.match(/Version\/(\d+)/);
        let version = parseInt(match[1]) || 0;
        if (version >= 6) {
            qs.set('jp2', '1');
        }
    }

    var optimizedUri = '/?' + qs.toString();

    response
        .status(200)
        .set({
        'cache-control': 'no-cache'
        }).send(`<html><head><title>Optimized Image</title></head><body><div>${optimizedUri}</div><img src="${optimizedUri}" /></body></html>`);
}

exports.write = write;