# Sasazka

Yet another HTTP/2 implementation for Node.js.  
This module supports [draft-ietf-httpbis-http2-14](http://tools.ietf.org/html/draft-ietf-httpbis-http2-14).

## Usage

````
var fs = require('fs');
var http2 = require('sasazka');

var options = {
  key: fs.readFileSync('ssl/key.pem'),
  cert: fs.readFileSync('ssl/cert.pem'),
  maxConcurrentStreams: 100
};

var server = http2.createServer(options, function (req, res) {
  res.push('/pushed.txt', function (pushReq, pushRes) {
    pushRes.end('Server pushed!');
  });

  res.writeHead(200);
  res.end('Hello HTTP/2!');
});

server.listen(443);
````

## Notes

* ALPN is not yet supported in Node.js. Sasazka uses NPN for negotiation.
* To enable debug logger, you must set environment valiable `DEBUG=serializer,deserializer`.

## TODO  

* API documents
* Client APIs
* Better HTTP layer APIs
* Support HTTP Upgrade
* Support stream priority
* Better flow control
* Upload to the npm registry

## LICENSE

The MIT License

Copyright (c) 2014 Moto Ishizawa

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

