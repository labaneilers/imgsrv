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

    let optimizedUri = '/?' + qs.toString();

    response
        .status(200)
        .set({
            'cache-control': 'no-cache'
        })
        .send(`
            <html>
            <head>
                <title>Optimized Image</title>
                <style>
                label { font-weight: bold; }
                body { font-family: Arial; }
                div { margin: 10px; }
                </style>
            </head>
            <body>
                <div><label>URL:</label> <span>${optimizedUri}</span></div>
                <div><label>Accept:</label> <span>${accept}</span></div>
                <div><label>UserAgent:</label> <span>${ua}</span></div>
                <div><label>Size:</label> <span id="size"></span></div>
                <div>
                    <img src="${optimizedUri}" />
                </div>

                <script>
                function getSize() {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', '${optimizedUri}', true);
                    xhr.onreadystatechange = function(){
                        if ( xhr.readyState == 4 ) {
                            if ( xhr.status == 200 ) {
                                var size = parseInt(xhr.getResponseHeader('Content-Length'));
                                document.getElementById("size").innerHTML = Math.round(size / 1024) + 'KB (' + size.toLocaleString() + ' bytes)';
                            } 
                        }
                    };
                    xhr.send(null);
                }
                getSize();
                </script>
            </body>
            </html>`);
}

exports.write = write;