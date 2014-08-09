var expect = require('expect.js');

var hpack = require('../lib/hpack');

describe('HPACK', function () {
  describe('compress()', function () {
    describe('Request Examples with Huffman Coding', function () {
      var encoder = hpack.createContext();

      it('encodes the first request headers', function () {
        var headers = [
          [ ':method',    'GET'             ],
          [ ':scheme',    'http'            ],
          [ ':path',      '/'               ],
          [ ':authority', 'www.example.com' ]
        ];

        var expected = new Buffer([
          0x82, 0x86, 0x84, 0x41, 0x8c, 0xf1, 0xe3, 0xc2,
          0xe5, 0xf2, 0x3a, 0x6b, 0xa0, 0xab, 0x90, 0xf4,
          0xff
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });

      it('encodes the second request headers', function () {
        var headers = [
          [ ':method',       'GET'             ],
          [ ':scheme',       'http'            ],
          [ ':path',         '/'               ],
          [ ':authority',    'www.example.com' ],
          [ 'cache-control', 'no-cache'        ]
        ];

        var expected = new Buffer([
          0x82, 0x86, 0x84, 0xbe, 0x58, 0x86, 0xa8, 0xeb,
          0x10, 0x64, 0x9c, 0xbf
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });

      it('encodes the third request headers', function () {
        var headers = [
          [ ':method',    'GET'             ],
          [ ':scheme',    'https'           ],
          [ ':path',      '/index.html'     ],
          [ ':authority', 'www.example.com' ],
          [ 'custom-key', 'custom-value'    ]
        ];

        var expected = new Buffer([
          0x82, 0x87, 0x85, 0xbf, 0x40, 0x88, 0x25, 0xa8,
          0x49, 0xe9, 0x5b, 0xa9, 0x7d, 0x7f, 0x89, 0x25,
          0xa8, 0x49, 0xe9, 0x5b, 0xb8, 0xe8, 0xb4, 0xbf
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });
    });

    context('Request Examples without Huffman Coding', function () {
      var encoder = hpack.createContext({ huffman: false });

      it('encodes the first request headers', function () {
        var headers = [
          [ ':method',    'GET'             ],
          [ ':scheme',    'http'            ],
          [ ':path',      '/'               ],
          [ ':authority', 'www.example.com' ]
        ];

        var expected = new Buffer([
          0x82, 0x86, 0x84, 0x41, 0x0f, 0x77, 0x77, 0x77,
          0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
          0x2e, 0x63, 0x6f, 0x6d
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });

      it('encodes the second request headers', function () {
        var headers = [
          [ ':method',       'GET'             ],
          [ ':scheme',       'http'            ],
          [ ':path',         '/'               ],
          [ ':authority',    'www.example.com' ],
          [ 'cache-control', 'no-cache'        ]
        ];

        var expected = new Buffer([
          0x82, 0x86, 0x84, 0xbe, 0x58, 0x08, 0x6e, 0x6f,
          0x2d, 0x63, 0x61, 0x63, 0x68, 0x65
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });

      it('encodes the third request headers', function () {
        var headers = [
          [ ':method',    'GET'             ],
          [ ':scheme',    'https'           ],
          [ ':path',      '/index.html'     ],
          [ ':authority', 'www.example.com' ],
          [ 'custom-key', 'custom-value'    ]
        ];

        var expected = new Buffer([
          0x82, 0x87, 0x85, 0xbf, 0x40, 0x0a, 0x63, 0x75,
          0x73, 0x74, 0x6f, 0x6d, 0x2d, 0x6b, 0x65, 0x79,
          0x0c, 0x63, 0x75, 0x73, 0x74, 0x6f, 0x6d, 0x2d,
          0x76, 0x61, 0x6c, 0x75, 0x65
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });
    });

    describe('Response Examples with Huffman Coding', function () {
      var encoder = hpack.createContext();

      it('encodes the first response headers', function () {
        var headers = [
          [ ':status',       '302'                           ],
          [ 'cache-control', 'private'                       ],
          [ 'date',          'Mon, 21 Oct 2013 20:13:21 GMT' ],
          [ 'location',      'https://www.example.com'       ]
        ];

        var expected = new Buffer([
          0x48, 0x82, 0x64, 0x02, 0x58, 0x85, 0xae, 0xc3,
          0x77, 0x1a, 0x4b, 0x61, 0x96, 0xd0, 0x7a, 0xbe,
          0x94, 0x10, 0x54, 0xd4, 0x44, 0xa8, 0x20, 0x05,
          0x95, 0x04, 0x0b, 0x81, 0x66, 0xe0, 0x82, 0xa6,
          0x2d, 0x1b, 0xff, 0x0f, 0x1f, 0x91, 0x9d, 0x29,
          0xad, 0x17, 0x18, 0x63, 0xc7, 0x8f, 0x0b, 0x97,
          0xc8, 0xe9, 0xae, 0x82, 0xae, 0x43, 0xd3
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });

      it('encodes the second response headers', function () {
        var headers = [
          [ ':status',       '307'                           ],
          [ 'cache-control', 'private'                       ],
          [ 'date',          'Mon, 21 Oct 2013 20:13:21 GMT' ],
          [ 'location',      'https://www.example.com'       ]
        ];

        var expected = new Buffer([
          0x48, 0x83, 0x64, 0x0e, 0xff, 0xc0, 0xbf, 0x0f,
          0x1f, 0x91, 0x9d, 0x29, 0xad, 0x17, 0x18, 0x63,
          0xc7, 0x8f, 0x0b, 0x97, 0xc8, 0xe9, 0xae, 0x82,
          0xae, 0x43, 0xd3
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });

      it('encodes the third response headers', function () {
        var cookie = 'foo=ASDJKHQKBZXOQWEOPIUAXQWEOIU; max-age=3600; version=1';
        var headers = [
          [ ':status',          '200'                           ],
          [ 'cache-control',    'private'                       ],
          [ 'date',             'Mon, 21 Oct 2013 20:13:22 GMT' ],
          [ 'location',         'https://www.example.com'       ],
          [ 'content-encoding', 'gzip'                          ],
          [ 'set-cookie',       cookie                          ]
        ];

        var expected = new Buffer([
          0x88, 0xc0, 0x61, 0x96, 0xd0, 0x7a, 0xbe, 0x94,
          0x10, 0x54, 0xd4, 0x44, 0xa8, 0x20, 0x05, 0x95,
          0x04, 0x0b, 0x81, 0x66, 0xe0, 0x84, 0xa6, 0x2d,
          0x1b, 0xff, 0x0f, 0x1f, 0x91, 0x9d, 0x29, 0xad,
          0x17, 0x18, 0x63, 0xc7, 0x8f, 0x0b, 0x97, 0xc8,
          0xe9, 0xae, 0x82, 0xae, 0x43, 0xd3, 0x5a, 0x83,
          0x9b, 0xd9, 0xab, 0x0f, 0x28, 0xad, 0x94, 0xe7,
          0x82, 0x1d, 0xd7, 0xf2, 0xe6, 0xc7, 0xb3, 0x35,
          0xdf, 0xdf, 0xcd, 0x5b, 0x39, 0x60, 0xd5, 0xaf,
          0x27, 0x08, 0x7f, 0x36, 0x72, 0xc1, 0xab, 0x27,
          0x0f, 0xb5, 0x29, 0x1f, 0x95, 0x87, 0x31, 0x60,
          0x65, 0xc0, 0x03, 0xed, 0x4e, 0xe5, 0xb1, 0x06,
          0x3d, 0x50, 0x07
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });
    });

    describe('Response Examples without Huffman Coding', function () {
      var encoder = hpack.createContext({ huffman: false });

      it('encodes the first response headers', function () {
        var headers = [
          [ ':status',       '302'                           ],
          [ 'cache-control', 'private'                       ],
          [ 'date',          'Mon, 21 Oct 2013 20:13:21 GMT' ],
          [ 'location',      'https://www.example.com'       ]
        ];

        var expected = new Buffer([
          0x48, 0x03, 0x33, 0x30, 0x32, 0x58, 0x07, 0x70,
          0x72, 0x69, 0x76, 0x61, 0x74, 0x65, 0x61, 0x1d,
          0x4d, 0x6f, 0x6e, 0x2c, 0x20, 0x32, 0x31, 0x20,
          0x4f, 0x63, 0x74, 0x20, 0x32, 0x30, 0x31, 0x33,
          0x20, 0x32, 0x30, 0x3a, 0x31, 0x33, 0x3a, 0x32,
          0x31, 0x20, 0x47, 0x4d, 0x54, 0x0f, 0x1f, 0x17,
          0x68, 0x74, 0x74, 0x70, 0x73, 0x3a, 0x2f, 0x2f,
          0x77, 0x77, 0x77, 0x2e, 0x65, 0x78, 0x61, 0x6d,
          0x70, 0x6c, 0x65, 0x2e, 0x63, 0x6f, 0x6d
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });

      it('encodes the second response headers', function () {
        var headers = [
          [ ':status',       '307'                           ],
          [ 'cache-control', 'private'                       ],
          [ 'date',          'Mon, 21 Oct 2013 20:13:21 GMT' ],
          [ 'location',      'https://www.example.com'       ]
        ];

        var expected = new Buffer([
          0x48, 0x03, 0x33, 0x30, 0x37, 0xc0, 0xbf, 0x0f,
          0x1f, 0x17, 0x68, 0x74, 0x74, 0x70, 0x73, 0x3a,
          0x2f, 0x2f, 0x77, 0x77, 0x77, 0x2e, 0x65, 0x78,
          0x61, 0x6d, 0x70, 0x6c, 0x65, 0x2e, 0x63, 0x6f,
          0x6d
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });

      it('encodes the third response headers', function () {
        var cookie = 'foo=ASDJKHQKBZXOQWEOPIUAXQWEOIU; max-age=3600; version=1';
        var headers = [
          [ ':status',          '200'                           ],
          [ 'cache-control',    'private'                       ],
          [ 'date',             'Mon, 21 Oct 2013 20:13:22 GMT' ],
          [ 'location',         'https://www.example.com'       ],
          [ 'content-encoding', 'gzip'                          ],
          [ 'set-cookie',       cookie                          ]
        ];

        var expected = new Buffer([
          0x88, 0xc0, 0x61, 0x1d, 0x4d, 0x6f, 0x6e, 0x2c,
          0x20, 0x32, 0x31, 0x20, 0x4f, 0x63, 0x74, 0x20,
          0x32, 0x30, 0x31, 0x33, 0x20, 0x32, 0x30, 0x3a,
          0x31, 0x33, 0x3a, 0x32, 0x32, 0x20, 0x47, 0x4d,
          0x54, 0x0f, 0x1f, 0x17, 0x68, 0x74, 0x74, 0x70,
          0x73, 0x3a, 0x2f, 0x2f, 0x77, 0x77, 0x77, 0x2e,
          0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65, 0x2e,
          0x63, 0x6f, 0x6d, 0x5a, 0x04, 0x67, 0x7a, 0x69,
          0x70, 0x0f, 0x28, 0x38, 0x66, 0x6f, 0x6f, 0x3d,
          0x41, 0x53, 0x44, 0x4a, 0x4b, 0x48, 0x51, 0x4b,
          0x42, 0x5a, 0x58, 0x4f, 0x51, 0x57, 0x45, 0x4f,
          0x50, 0x49, 0x55, 0x41, 0x58, 0x51, 0x57, 0x45,
          0x4f, 0x49, 0x55, 0x3b, 0x20, 0x6d, 0x61, 0x78,
          0x2d, 0x61, 0x67, 0x65, 0x3d, 0x33, 0x36, 0x30,
          0x30, 0x3b, 0x20, 0x76, 0x65, 0x72, 0x73, 0x69,
          0x6f, 0x6e, 0x3d, 0x31
        ]);

        var buffer = encoder.compress(headers);
        expect(buffer).to.eql(expected);
      });
    });
  });

  describe('decompress()', function () {
    describe('Request Examples with Huffman Coding', function () {
      var decoder = hpack.createContext();

      it('decodes the first request headers', function () {
        var buffer = new Buffer([
          0x82, 0x86, 0x84, 0x41, 0x8c, 0xf1, 0xe3, 0xc2,
          0xe5, 0xf2, 0x3a, 0x6b, 0xa0, 0xab, 0x90, 0xf4,
          0xff
        ]);

        var expected = [
          [ ':method',    'GET'             ],
          [ ':scheme',    'http'            ],
          [ ':path',      '/'               ],
          [ ':authority', 'www.example.com' ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });

      it('decodes the second request headers', function () {
        var buffer = new Buffer([
          0x82, 0x86, 0x84, 0xbe, 0x58, 0x86, 0xa8, 0xeb,
          0x10, 0x64, 0x9c, 0xbf
        ]);

        var expected = [
          [ ':method',       'GET'             ],
          [ ':scheme',       'http'            ],
          [ ':path',         '/'               ],
          [ ':authority',    'www.example.com' ],
          [ 'cache-control', 'no-cache'        ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });

      it('decodes the third request headers', function () {
        var buffer = new Buffer([
          0x82, 0x87, 0x85, 0xbf, 0x40, 0x88, 0x25, 0xa8,
          0x49, 0xe9, 0x5b, 0xa9, 0x7d, 0x7f, 0x89, 0x25,
          0xa8, 0x49, 0xe9, 0x5b, 0xb8, 0xe8, 0xb4, 0xbf
        ]);

        var expected = [
          [ ':method',    'GET'             ],
          [ ':scheme',    'https'           ],
          [ ':path',      '/index.html'     ],
          [ ':authority', 'www.example.com' ],
          [ 'custom-key', 'custom-value'    ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });
    });

    context('Request Examples without Huffman Coding', function () {
      var decoder = hpack.createContext({ huffman: false });

      it('decodes the first request headers', function () {
        var buffer = new Buffer([
          0x82, 0x86, 0x84, 0x41, 0x0f, 0x77, 0x77, 0x77,
          0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
          0x2e, 0x63, 0x6f, 0x6d
        ]);

        var expected = [
          [ ':method',    'GET'             ],
          [ ':scheme',    'http'            ],
          [ ':path',      '/'               ],
          [ ':authority', 'www.example.com' ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });

      it('decodes the second request headers', function () {
        var buffer = new Buffer([
          0x82, 0x86, 0x84, 0xbe, 0x58, 0x08, 0x6e, 0x6f,
          0x2d, 0x63, 0x61, 0x63, 0x68, 0x65
        ]);

        var expected = [
          [ ':method',       'GET'             ],
          [ ':scheme',       'http'            ],
          [ ':path',         '/'               ],
          [ ':authority',    'www.example.com' ],
          [ 'cache-control', 'no-cache'        ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });

      it('decodes the third request headers', function () {
        var buffer = new Buffer([
          0x82, 0x87, 0x85, 0xbf, 0x40, 0x0a, 0x63, 0x75,
          0x73, 0x74, 0x6f, 0x6d, 0x2d, 0x6b, 0x65, 0x79,
          0x0c, 0x63, 0x75, 0x73, 0x74, 0x6f, 0x6d, 0x2d,
          0x76, 0x61, 0x6c, 0x75, 0x65
        ]);

        var expected = [
          [ ':method',    'GET'             ],
          [ ':scheme',    'https'           ],
          [ ':path',      '/index.html'     ],
          [ ':authority', 'www.example.com' ],
          [ 'custom-key', 'custom-value'    ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });
    });

    describe('Response Examples with Huffman Coding', function () {
      var decoder = hpack.createContext();

      it('decodes the first request headers', function () {
        var buffer = new Buffer([
          0x48, 0x82, 0x64, 0x02, 0x58, 0x85, 0xae, 0xc3,
          0x77, 0x1a, 0x4b, 0x61, 0x96, 0xd0, 0x7a, 0xbe,
          0x94, 0x10, 0x54, 0xd4, 0x44, 0xa8, 0x20, 0x05,
          0x95, 0x04, 0x0b, 0x81, 0x66, 0xe0, 0x82, 0xa6,
          0x2d, 0x1b, 0xff, 0x0f, 0x1f, 0x91, 0x9d, 0x29,
          0xad, 0x17, 0x18, 0x63, 0xc7, 0x8f, 0x0b, 0x97,
          0xc8, 0xe9, 0xae, 0x82, 0xae, 0x43, 0xd3
        ]);

        var expected = [
          [ ':status',       '302'                           ],
          [ 'cache-control', 'private'                       ],
          [ 'date',          'Mon, 21 Oct 2013 20:13:21 GMT' ],
          [ 'location',      'https://www.example.com'       ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });

      it('decodes the second request headers', function () {
        var buffer = new Buffer([
          0x48, 0x83, 0x64, 0x0e, 0xff, 0xc0, 0xbf, 0x0f,
          0x1f, 0x91, 0x9d, 0x29, 0xad, 0x17, 0x18, 0x63,
          0xc7, 0x8f, 0x0b, 0x97, 0xc8, 0xe9, 0xae, 0x82,
          0xae, 0x43, 0xd3
        ]);

        var expected = [
          [ ':status',       '307'                           ],
          [ 'cache-control', 'private'                       ],
          [ 'date',          'Mon, 21 Oct 2013 20:13:21 GMT' ],
          [ 'location',      'https://www.example.com'       ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });

      it('decodes the third request headers', function () {
        var cookie = 'foo=ASDJKHQKBZXOQWEOPIUAXQWEOIU; max-age=3600; version=1';
        var buffer = new Buffer([
          0x88, 0xc0, 0x61, 0x96, 0xd0, 0x7a, 0xbe, 0x94,
          0x10, 0x54, 0xd4, 0x44, 0xa8, 0x20, 0x05, 0x95,
          0x04, 0x0b, 0x81, 0x66, 0xe0, 0x84, 0xa6, 0x2d,
          0x1b, 0xff, 0x0f, 0x1f, 0x91, 0x9d, 0x29, 0xad,
          0x17, 0x18, 0x63, 0xc7, 0x8f, 0x0b, 0x97, 0xc8,
          0xe9, 0xae, 0x82, 0xae, 0x43, 0xd3, 0x5a, 0x83,
          0x9b, 0xd9, 0xab, 0x0f, 0x28, 0xad, 0x94, 0xe7,
          0x82, 0x1d, 0xd7, 0xf2, 0xe6, 0xc7, 0xb3, 0x35,
          0xdf, 0xdf, 0xcd, 0x5b, 0x39, 0x60, 0xd5, 0xaf,
          0x27, 0x08, 0x7f, 0x36, 0x72, 0xc1, 0xab, 0x27,
          0x0f, 0xb5, 0x29, 0x1f, 0x95, 0x87, 0x31, 0x60,
          0x65, 0xc0, 0x03, 0xed, 0x4e, 0xe5, 0xb1, 0x06,
          0x3d, 0x50, 0x07
        ]);

        var expected = [
          [ ':status',          '200'                           ],
          [ 'cache-control',    'private'                       ],
          [ 'date',             'Mon, 21 Oct 2013 20:13:22 GMT' ],
          [ 'location',         'https://www.example.com'       ],
          [ 'content-encoding', 'gzip'                          ],
          [ 'set-cookie',       cookie                          ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });
    });

    describe('Response Examples without Huffman Coding', function () {
      var decoder = hpack.createContext({ huffman: false });

      it('decodes the first request headers', function () {
        var buffer = new Buffer([
          0x48, 0x03, 0x33, 0x30, 0x32, 0x58, 0x07, 0x70,
          0x72, 0x69, 0x76, 0x61, 0x74, 0x65, 0x61, 0x1d,
          0x4d, 0x6f, 0x6e, 0x2c, 0x20, 0x32, 0x31, 0x20,
          0x4f, 0x63, 0x74, 0x20, 0x32, 0x30, 0x31, 0x33,
          0x20, 0x32, 0x30, 0x3a, 0x31, 0x33, 0x3a, 0x32,
          0x31, 0x20, 0x47, 0x4d, 0x54, 0x0f, 0x1f, 0x17,
          0x68, 0x74, 0x74, 0x70, 0x73, 0x3a, 0x2f, 0x2f,
          0x77, 0x77, 0x77, 0x2e, 0x65, 0x78, 0x61, 0x6d,
          0x70, 0x6c, 0x65, 0x2e, 0x63, 0x6f, 0x6d
        ]);

        var expected = [
          [ ':status',       '302'                           ],
          [ 'cache-control', 'private'                       ],
          [ 'date',          'Mon, 21 Oct 2013 20:13:21 GMT' ],
          [ 'location',      'https://www.example.com'       ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });

      it('decodes the second request headers', function () {
        var buffer = new Buffer([
          0x48, 0x03, 0x33, 0x30, 0x37, 0xc0, 0xbf, 0x0f,
          0x1f, 0x17, 0x68, 0x74, 0x74, 0x70, 0x73, 0x3a,
          0x2f, 0x2f, 0x77, 0x77, 0x77, 0x2e, 0x65, 0x78,
          0x61, 0x6d, 0x70, 0x6c, 0x65, 0x2e, 0x63, 0x6f,
          0x6d
        ]);

        var expected = [
          [ ':status',       '307'                           ],
          [ 'cache-control', 'private'                       ],
          [ 'date',          'Mon, 21 Oct 2013 20:13:21 GMT' ],
          [ 'location',      'https://www.example.com'       ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });

      it('decodes the third request headers', function () {
        var cookie = 'foo=ASDJKHQKBZXOQWEOPIUAXQWEOIU; max-age=3600; version=1';
        var buffer = new Buffer([
          0x88, 0xc0, 0x61, 0x1d, 0x4d, 0x6f, 0x6e, 0x2c,
          0x20, 0x32, 0x31, 0x20, 0x4f, 0x63, 0x74, 0x20,
          0x32, 0x30, 0x31, 0x33, 0x20, 0x32, 0x30, 0x3a,
          0x31, 0x33, 0x3a, 0x32, 0x32, 0x20, 0x47, 0x4d,
          0x54, 0x0f, 0x1f, 0x17, 0x68, 0x74, 0x74, 0x70,
          0x73, 0x3a, 0x2f, 0x2f, 0x77, 0x77, 0x77, 0x2e,
          0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65, 0x2e,
          0x63, 0x6f, 0x6d, 0x5a, 0x04, 0x67, 0x7a, 0x69,
          0x70, 0x0f, 0x28, 0x38, 0x66, 0x6f, 0x6f, 0x3d,
          0x41, 0x53, 0x44, 0x4a, 0x4b, 0x48, 0x51, 0x4b,
          0x42, 0x5a, 0x58, 0x4f, 0x51, 0x57, 0x45, 0x4f,
          0x50, 0x49, 0x55, 0x41, 0x58, 0x51, 0x57, 0x45,
          0x4f, 0x49, 0x55, 0x3b, 0x20, 0x6d, 0x61, 0x78,
          0x2d, 0x61, 0x67, 0x65, 0x3d, 0x33, 0x36, 0x30,
          0x30, 0x3b, 0x20, 0x76, 0x65, 0x72, 0x73, 0x69,
          0x6f, 0x6e, 0x3d, 0x31
        ]);

        var expected = [
          [ ':status',          '200'                           ],
          [ 'cache-control',    'private'                       ],
          [ 'date',             'Mon, 21 Oct 2013 20:13:22 GMT' ],
          [ 'location',         'https://www.example.com'       ],
          [ 'content-encoding', 'gzip'                          ],
          [ 'set-cookie',       cookie                          ]
        ];

        var headers = decoder.decompress(buffer);
        expect(headers).to.eql(expected);
      });
    });
  });
});