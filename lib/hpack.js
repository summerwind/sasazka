var REP_INDEXED           = 0;
var REP_LITERAL_INCR      = 1;
var REP_LITERAL           = 2;
var REP_LITERAL_NEVER     = 3;
var REP_HEADER_TABLE_SIZE = 4;

var REP_INFO = [
  { prefix: 7, mask: 0x80 },  // REP_INDEXED
  { prefix: 6, mask: 0x40 },  // REP_LITERAL_INCR
  { prefix: 4, mask: 0x00 },  // REP_LITERAL
  { prefix: 4, mask: 0x10 },  // REP_LITERAL_NEVER
  { prefix: 5, mask: 0x20 }   // REP_HEADER_TABLE_SIZE
];

var STATIC_TABLE_PAIRS = [
  [ ':authority',                  ''              ],
  [ ':method',                     'GET'           ],
  [ ':method',                     'POST'          ],
  [ ':path',                       '/'             ],
  [ ':path',                       '/index.html'   ],
  [ ':scheme',                     'http'          ],
  [ ':scheme',                     'https'         ],
  [ ':status',                     '200'           ],
  [ ':status',                     '204'           ],
  [ ':status',                     '206'           ],
  [ ':status',                     '304'           ],
  [ ':status',                     '400'           ],
  [ ':status',                     '404'           ],
  [ ':status',                     '500'           ],
  [ 'accept-charset',              ''              ],
  [ 'accept-encoding',             'gzip, deflate' ],
  [ 'accept-language',             ''              ],
  [ 'accept-ranges',               ''              ],
  [ 'accept',                      ''              ],
  [ 'access-control-allow-origin', ''              ],
  [ 'age',                         ''              ],
  [ 'allow',                       ''              ],
  [ 'authorization',               ''              ],
  [ 'cache-control',               ''              ],
  [ 'content-disposition',         ''              ],
  [ 'content-encoding',            ''              ],
  [ 'content-language',            ''              ],
  [ 'content-length',              ''              ],
  [ 'content-location',            ''              ],
  [ 'content-range',               ''              ],
  [ 'content-type',                ''              ],
  [ 'cookie',                      ''              ],
  [ 'date',                        ''              ],
  [ 'etag',                        ''              ],
  [ 'expect',                      ''              ],
  [ 'expires',                     ''              ],
  [ 'from',                        ''              ],
  [ 'host',                        ''              ],
  [ 'if-match',                    ''              ],
  [ 'if-modified-since',           ''              ],
  [ 'if-none-match',               ''              ],
  [ 'if-range',                    ''              ],
  [ 'if-unmodified-since',         ''              ],
  [ 'last-modified',               ''              ],
  [ 'link',                        ''              ],
  [ 'location',                    ''              ],
  [ 'max-forwards',                ''              ],
  [ 'proxy-authenticate',          ''              ],
  [ 'proxy-authorization',         ''              ],
  [ 'range',                       ''              ],
  [ 'referer',                     ''              ],
  [ 'refresh',                     ''              ],
  [ 'retry-after',                 ''              ],
  [ 'server',                      ''              ],
  [ 'set-cookie',                  ''              ],
  [ 'strict-transport-security',   ''              ],
  [ 'transfer-encoding',           ''              ],
  [ 'user-agent',                  ''              ],
  [ 'vary',                        ''              ],
  [ 'via',                         ''              ],
  [ 'www-authenticate',            ''              ]
];

var HUFFMAN_TABLE = [
  { code: 0x1ff8,     bit: 13 },
  { code: 0x7fffd8,   bit: 23 },
  { code: 0xfffffe2,  bit: 28 },
  { code: 0xfffffe3,  bit: 28 },
  { code: 0xfffffe4,  bit: 28 },
  { code: 0xfffffe5,  bit: 28 },
  { code: 0xfffffe6,  bit: 28 },
  { code: 0xfffffe7,  bit: 28 },
  { code: 0xfffffe8,  bit: 28 },
  { code: 0xffffea,   bit: 24 },
  { code: 0x3ffffffc, bit: 30 },
  { code: 0xfffffe9,  bit: 28 },
  { code: 0xfffffea,  bit: 28 },
  { code: 0x3ffffffd, bit: 30 },
  { code: 0xfffffeb,  bit: 28 },
  { code: 0xfffffec,  bit: 28 },
  { code: 0xfffffed,  bit: 28 },
  { code: 0xfffffee,  bit: 28 },
  { code: 0xfffffef,  bit: 28 },
  { code: 0xffffff0,  bit: 28 },
  { code: 0xffffff1,  bit: 28 },
  { code: 0xffffff2,  bit: 28 },
  { code: 0x3ffffffe, bit: 30 },
  { code: 0xffffff3,  bit: 28 },
  { code: 0xffffff4,  bit: 28 },
  { code: 0xffffff5,  bit: 28 },
  { code: 0xffffff6,  bit: 28 },
  { code: 0xffffff7,  bit: 28 },
  { code: 0xffffff8,  bit: 28 },
  { code: 0xffffff9,  bit: 28 },
  { code: 0xffffffa,  bit: 28 },
  { code: 0xffffffb,  bit: 28 },
  { code: 0x14,       bit: 6  },
  { code: 0x3f8,      bit: 10 },
  { code: 0x3f9,      bit: 10 },
  { code: 0xffa,      bit: 12 },
  { code: 0x1ff9,     bit: 13 },
  { code: 0x15,       bit: 6  },
  { code: 0xf8,       bit: 8  },
  { code: 0x7fa,      bit: 11 },
  { code: 0x3fa,      bit: 10 },
  { code: 0x3fb,      bit: 10 },
  { code: 0xf9,       bit: 8  },
  { code: 0x7fb,      bit: 11 },
  { code: 0xfa,       bit: 8  },
  { code: 0x16,       bit: 6  },
  { code: 0x17,       bit: 6  },
  { code: 0x18,       bit: 6  },
  { code: 0x0,        bit: 5  },
  { code: 0x1,        bit: 5  },
  { code: 0x2,        bit: 5  },
  { code: 0x19,       bit: 6  },
  { code: 0x1a,       bit: 6  },
  { code: 0x1b,       bit: 6  },
  { code: 0x1c,       bit: 6  },
  { code: 0x1d,       bit: 6  },
  { code: 0x1e,       bit: 6  },
  { code: 0x1f,       bit: 6  },
  { code: 0x5c,       bit: 7  },
  { code: 0xfb,       bit: 8  },
  { code: 0x7ffc,     bit: 15 },
  { code: 0x20,       bit: 6  },
  { code: 0xffb,      bit: 12 },
  { code: 0x3fc,      bit: 10 },
  { code: 0x1ffa,     bit: 13 },
  { code: 0x21,       bit: 6  },
  { code: 0x5d,       bit: 7  },
  { code: 0x5e,       bit: 7  },
  { code: 0x5f,       bit: 7  },
  { code: 0x60,       bit: 7  },
  { code: 0x61,       bit: 7  },
  { code: 0x62,       bit: 7  },
  { code: 0x63,       bit: 7  },
  { code: 0x64,       bit: 7  },
  { code: 0x65,       bit: 7  },
  { code: 0x66,       bit: 7  },
  { code: 0x67,       bit: 7  },
  { code: 0x68,       bit: 7  },
  { code: 0x69,       bit: 7  },
  { code: 0x6a,       bit: 7  },
  { code: 0x6b,       bit: 7  },
  { code: 0x6c,       bit: 7  },
  { code: 0x6d,       bit: 7  },
  { code: 0x6e,       bit: 7  },
  { code: 0x6f,       bit: 7  },
  { code: 0x70,       bit: 7  },
  { code: 0x71,       bit: 7  },
  { code: 0x72,       bit: 7  },
  { code: 0xfc,       bit: 8  },
  { code: 0x73,       bit: 7  },
  { code: 0xfd,       bit: 8  },
  { code: 0x1ffb,     bit: 13 },
  { code: 0x7fff0,    bit: 19 },
  { code: 0x1ffc,     bit: 13 },
  { code: 0x3ffc,     bit: 14 },
  { code: 0x22,       bit: 6  },
  { code: 0x7ffd,     bit: 15 },
  { code: 0x3,        bit: 5  },
  { code: 0x23,       bit: 6  },
  { code: 0x4,        bit: 5  },
  { code: 0x24,       bit: 6  },
  { code: 0x5,        bit: 5  },
  { code: 0x25,       bit: 6  },
  { code: 0x26,       bit: 6  },
  { code: 0x27,       bit: 6  },
  { code: 0x6,        bit: 5  },
  { code: 0x74,       bit: 7  },
  { code: 0x75,       bit: 7  },
  { code: 0x28,       bit: 6  },
  { code: 0x29,       bit: 6  },
  { code: 0x2a,       bit: 6  },
  { code: 0x7,        bit: 5  },
  { code: 0x2b,       bit: 6  },
  { code: 0x76,       bit: 7  },
  { code: 0x2c,       bit: 6  },
  { code: 0x8,        bit: 5  },
  { code: 0x9,        bit: 5  },
  { code: 0x2d,       bit: 6  },
  { code: 0x77,       bit: 7  },
  { code: 0x78,       bit: 7  },
  { code: 0x79,       bit: 7  },
  { code: 0x7a,       bit: 7  },
  { code: 0x7b,       bit: 7  },
  { code: 0x7ffe,     bit: 15 },
  { code: 0x7fc,      bit: 11 },
  { code: 0x3ffd,     bit: 14 },
  { code: 0x1ffd,     bit: 13 },
  { code: 0xffffffc,  bit: 28 },
  { code: 0xfffe6,    bit: 20 },
  { code: 0x3fffd2,   bit: 22 },
  { code: 0xfffe7,    bit: 20 },
  { code: 0xfffe8,    bit: 20 },
  { code: 0x3fffd3,   bit: 22 },
  { code: 0x3fffd4,   bit: 22 },
  { code: 0x3fffd5,   bit: 22 },
  { code: 0x7fffd9,   bit: 23 },
  { code: 0x3fffd6,   bit: 22 },
  { code: 0x7fffda,   bit: 23 },
  { code: 0x7fffdb,   bit: 23 },
  { code: 0x7fffdc,   bit: 23 },
  { code: 0x7fffdd,   bit: 23 },
  { code: 0x7fffde,   bit: 23 },
  { code: 0xffffeb,   bit: 24 },
  { code: 0x7fffdf,   bit: 23 },
  { code: 0xffffec,   bit: 24 },
  { code: 0xffffed,   bit: 24 },
  { code: 0x3fffd7,   bit: 22 },
  { code: 0x7fffe0,   bit: 23 },
  { code: 0xffffee,   bit: 24 },
  { code: 0x7fffe1,   bit: 23 },
  { code: 0x7fffe2,   bit: 23 },
  { code: 0x7fffe3,   bit: 23 },
  { code: 0x7fffe4,   bit: 23 },
  { code: 0x1fffdc,   bit: 21 },
  { code: 0x3fffd8,   bit: 22 },
  { code: 0x7fffe5,   bit: 23 },
  { code: 0x3fffd9,   bit: 22 },
  { code: 0x7fffe6,   bit: 23 },
  { code: 0x7fffe7,   bit: 23 },
  { code: 0xffffef,   bit: 24 },
  { code: 0x3fffda,   bit: 22 },
  { code: 0x1fffdd,   bit: 21 },
  { code: 0xfffe9,    bit: 20 },
  { code: 0x3fffdb,   bit: 22 },
  { code: 0x3fffdc,   bit: 22 },
  { code: 0x7fffe8,   bit: 23 },
  { code: 0x7fffe9,   bit: 23 },
  { code: 0x1fffde,   bit: 21 },
  { code: 0x7fffea,   bit: 23 },
  { code: 0x3fffdd,   bit: 22 },
  { code: 0x3fffde,   bit: 22 },
  { code: 0xfffff0,   bit: 24 },
  { code: 0x1fffdf,   bit: 21 },
  { code: 0x3fffdf,   bit: 22 },
  { code: 0x7fffeb,   bit: 23 },
  { code: 0x7fffec,   bit: 23 },
  { code: 0x1fffe0,   bit: 21 },
  { code: 0x1fffe1,   bit: 21 },
  { code: 0x3fffe0,   bit: 22 },
  { code: 0x1fffe2,   bit: 21 },
  { code: 0x7fffed,   bit: 23 },
  { code: 0x3fffe1,   bit: 22 },
  { code: 0x7fffee,   bit: 23 },
  { code: 0x7fffef,   bit: 23 },
  { code: 0xfffea,    bit: 20 },
  { code: 0x3fffe2,   bit: 22 },
  { code: 0x3fffe3,   bit: 22 },
  { code: 0x3fffe4,   bit: 22 },
  { code: 0x7ffff0,   bit: 23 },
  { code: 0x3fffe5,   bit: 22 },
  { code: 0x3fffe6,   bit: 22 },
  { code: 0x7ffff1,   bit: 23 },
  { code: 0x3ffffe0,  bit: 26 },
  { code: 0x3ffffe1,  bit: 26 },
  { code: 0xfffeb,    bit: 20 },
  { code: 0x7fff1,    bit: 19 },
  { code: 0x3fffe7,   bit: 22 },
  { code: 0x7ffff2,   bit: 23 },
  { code: 0x3fffe8,   bit: 22 },
  { code: 0x1ffffec,  bit: 25 },
  { code: 0x3ffffe2,  bit: 26 },
  { code: 0x3ffffe3,  bit: 26 },
  { code: 0x3ffffe4,  bit: 26 },
  { code: 0x7ffffde,  bit: 27 },
  { code: 0x7ffffdf,  bit: 27 },
  { code: 0x3ffffe5,  bit: 26 },
  { code: 0xfffff1,   bit: 24 },
  { code: 0x1ffffed,  bit: 25 },
  { code: 0x7fff2,    bit: 19 },
  { code: 0x1fffe3,   bit: 21 },
  { code: 0x3ffffe6,  bit: 26 },
  { code: 0x7ffffe0,  bit: 27 },
  { code: 0x7ffffe1,  bit: 27 },
  { code: 0x3ffffe7,  bit: 26 },
  { code: 0x7ffffe2,  bit: 27 },
  { code: 0xfffff2,   bit: 24 },
  { code: 0x1fffe4,   bit: 21 },
  { code: 0x1fffe5,   bit: 21 },
  { code: 0x3ffffe8,  bit: 26 },
  { code: 0x3ffffe9,  bit: 26 },
  { code: 0xffffffd,  bit: 28 },
  { code: 0x7ffffe3,  bit: 27 },
  { code: 0x7ffffe4,  bit: 27 },
  { code: 0x7ffffe5,  bit: 27 },
  { code: 0xfffec,    bit: 20 },
  { code: 0xfffff3,   bit: 24 },
  { code: 0xfffed,    bit: 20 },
  { code: 0x1fffe6,   bit: 21 },
  { code: 0x3fffe9,   bit: 22 },
  { code: 0x1fffe7,   bit: 21 },
  { code: 0x1fffe8,   bit: 21 },
  { code: 0x7ffff3,   bit: 23 },
  { code: 0x3fffea,   bit: 22 },
  { code: 0x3fffeb,   bit: 22 },
  { code: 0x1ffffee,  bit: 25 },
  { code: 0x1ffffef,  bit: 25 },
  { code: 0xfffff4,   bit: 24 },
  { code: 0xfffff5,   bit: 24 },
  { code: 0x3ffffea,  bit: 26 },
  { code: 0x7ffff4,   bit: 23 },
  { code: 0x3ffffeb,  bit: 26 },
  { code: 0x7ffffe6,  bit: 27 },
  { code: 0x3ffffec,  bit: 26 },
  { code: 0x3ffffed,  bit: 26 },
  { code: 0x7ffffe7,  bit: 27 },
  { code: 0x7ffffe8,  bit: 27 },
  { code: 0x7ffffe9,  bit: 27 },
  { code: 0x7ffffea,  bit: 27 },
  { code: 0x7ffffeb,  bit: 27 },
  { code: 0xffffffe,  bit: 28 },
  { code: 0x7ffffec,  bit: 27 },
  { code: 0x7ffffed,  bit: 27 },
  { code: 0x7ffffee,  bit: 27 },
  { code: 0x7ffffef,  bit: 27 },
  { code: 0x7fffff0,  bit: 27 },
  { code: 0x3ffffee,  bit: 26 },
  { code: 0x3fffffff, bit: 30 }
];

var HUFFMAN_TABLE_TREE = (function () {
  var root = [];
  var idx, len;

  for (idx = 0, len = HUFFMAN_TABLE.length; idx < len; idx++) {
    var node = root;
    var huffman = HUFFMAN_TABLE[idx];

    for (var bit=huffman.bit-1; bit>=0; bit--) {
      var tree = 0;
      if (((huffman.code >> bit) & 0x01) === 1) {
        tree = 1;
      }

      if (bit === 0) {
        node[tree] = idx;
      } else {
        if (node[tree] === undefined) {
          node[tree] = [];
        }
        node = node[tree];
      }
    }
  }

  return root;
})();

var DEFAULT_HEADER_TABLE_SIZE = 4096;

var LITERAL_HEADERS = {
  'set-cookie':     true,
  'content-length': true,
  'location':       true,
  'etag':           true,
  ':path':          true
};


// ========================================================
// Entry
// ========================================================
function Entry(name, value) {
  this.name  = name.toLowerCase();
  this.value = value;

  this.size = 32;
  this.size += new Buffer(this.name, 'ascii').length;
  this.size += new Buffer(this.value, 'ascii').length;
}

// ========================================================
// Static Table
// ========================================================
var STATIC_TABLE = STATIC_TABLE_PAIRS.map(function(pair){
  return new Entry(pair[0], pair[1]);
});
var STATIC_TABLE_LENGTH = STATIC_TABLE.length;


// ========================================================
// Header Table
// ========================================================
function HeaderTable(maxSize) {
  this._entries = [];
  this.length = 0;
  this.size = 0;
  this.maxSize = maxSize || DEFAULT_HEADER_TABLE_SIZE;
}

HeaderTable.prototype.setMaxSize = function (maxSize) {
  if (this.maxSize === maxSize) {
    return;
  }

  while(this.size > maxSize) {
    this.pop();
  }
  this.maxSize = maxSize;
};

HeaderTable.prototype.get = function (index) {
  var internalIndex = index - 1;

  if (index < STATIC_TABLE_LENGTH) {
    return STATIC_TABLE[internalIndex];
  }

  internalIndex = internalIndex - STATIC_TABLE_LENGTH;
  if (internalIndex >= this.length || !this._entries[internalIndex]) {
    throw new Error('Invalid index: ' + index);
  }

  return this._entries[internalIndex];
};

HeaderTable.prototype.find = function (name, value) {
  var idx, len, entry;
  var index = null;
  var exact = false;

  for (idx=0, len=STATIC_TABLE_LENGTH; idx<len; idx++) {
    entry = STATIC_TABLE[idx];

    if (entry.name === name) {
      if (entry.value === value) {
        index = idx + 1;
        exact = true;
        break;
      } else if (index === null) {
        index = idx + 1;
      }
    }
  }

  if (exact) {
    return {
      index: index,
      exact: exact
    };
  }

  for (idx=0, len=this.length; idx<len; idx++) {
    entry = this._entries[idx];

    if (entry.name === name) {
      if (entry.value === value) {
        index = idx + STATIC_TABLE_LENGTH + 1;
        exact = true;
        break;
      } else if (index === null) {
        index = idx + STATIC_TABLE_LENGTH + 1;
      }
    }
  }

  return {
    index: index,
    exact: exact
  };
};

HeaderTable.prototype.add = function (entry) {
  this._evict(entry);

  if (entry.size <= this.maxSize) {
    this._entries.unshift(entry);
    this.length++;
    this.size += entry.size;
  }
};

HeaderTable.prototype.pop = function () {
  var entry = this._entries.pop();
  this.length--;
  this.size -= entry.size;

  return entry;
};

HeaderTable.prototype._clear = function clear() {
  this._entries = [];
  this.length = 0;
  this.size = 0;
};

HeaderTable.prototype._evict = function _evict(entry) {
  if (entry.size > this.maxSize) {
    this._clear();
    return;
  }

  while ((this.size + entry.size) > this.maxSize) {
    this.pop();
  }
};


// ========================================================
// Huffman Table
// ========================================================
function HuffmanTable() {
  this._table = HUFFMAN_TABLE;
  this._tree  = HUFFMAN_TABLE_TREE;
}

HuffmanTable.prototype.encode = function (buffer) {
  var result = [];
  var data = 0;
  var remains = 8;
  var shift;

  for (var i=0, len=buffer.length; i<len; i++) {
    var huffman = this._table[buffer[i]];
    var bit = huffman.bit;

    while (bit > 0) {
      if (remains > bit) {
        shift = remains - bit;
        data += huffman.code << shift;
        remains -= bit;
        bit = 0;
      } else {
        shift = bit - remains;
        data += huffman.code >> shift;
        bit -= remains;
        remains -= remains;
      }

      if (remains === 0) {
        result.push(data);
        data = 0;
        remains = 8;
      }
    }
  }

  if (remains < 8) {
    shift = (this._table[256].bit - remains);
    data += this._table[256].code >> shift;
    result.push(data);
  }

  return new Buffer(result);
};

HuffmanTable.prototype.decode = function (buffer) {
  var str = '';
  var node = this._tree;

  for (var i=0, len=buffer.length; i<len; i++) {
    var data = buffer[i];

    for (var shift=7; shift>=0; shift--) {
      if(((data >> shift) & 0x1) === 1) {
        node = node[1];
      } else {
        node = node[0];
      }

      if (typeof node === 'number') {
        str += String.fromCharCode(node);
        node = this._tree;
      }
    }
  }

  return str;
};


// ========================================================
// HPACK Context
// ========================================================
function Context(options) {
  this.huffman = (options.huffman === false) ? false : true;

  this._headerTable = new HeaderTable(options.headerTableSize);
  this._huffmanTable = new HuffmanTable();

  this._updated = false;
}

Context.prototype.setHeaderTableSize = function (size) {
  this._headerTable.setMaxSize(size);
  this._updated = true;
};

Context.prototype.compress = function (headers) {
  var idx, len;
  var buffers = [];

  if (this._updated) {
    buffers.push(this._encodeHeader({
      type: REP_HEADER_TABLE_SIZE,
      size: this._headerTable.maxSize
    }));
    this._updated = false;
  }

  for (idx = 0, len = headers.length; idx < len; idx++) {
    var type, buffer;

    var name = headers[idx][0];
    var value = headers[idx][1];
    var result = this._headerTable.find(name, value);

    if (result.exact) {
      buffer = this._encodeHeader({
        type: REP_INDEXED,
        index: result.index
      });
      buffers.push(buffer);

      continue;
    }

    if (LITERAL_HEADERS[name]) {
      type = REP_LITERAL;
    } else {
      type = REP_LITERAL_INCR;

      var entry = new Entry(name, value);
      this._headerTable.add(entry);
    }

    if (result.index !== null) {
      buffer = this._encodeHeader({
        type: type,
        index: result.index,
        value: value
      });
    } else {
      buffer = this._encodeHeader({
        type: type,
        name: name,
        value: value
      });
    }

    buffers.push(buffer);
  }

  return Buffer.concat(buffers);
};

Context.prototype.decompress = function (buffer) {
  var headers = [];
  buffer._cursor = 0;

  while (buffer._cursor < buffer.length) {
    var entry;
    var cmd = this._decodeHeader(buffer);

    if (cmd.type === REP_HEADER_TABLE_SIZE) {
      this._headerTable.setMaxSize(cmd.size);
      continue;
    }

    if (cmd.type === REP_INDEXED) {
      entry = this._headerTable.get(cmd.index);
      headers.push([entry.name, entry.value]);
      continue;
    }

    if (cmd.index && cmd.index !== 0) {
      entry = this._headerTable.get(cmd.index);
      cmd.name = entry.name;
    }

    if (cmd.type === REP_LITERAL_INCR) {
      entry = new Entry(cmd.name, cmd.value);
      this._headerTable.add(entry);
    }

    headers.push([cmd.name, cmd.value]);
  }

  return headers;
};

Context.prototype._encodeHeader = function (cmd) {
  var index, buffers = [];
  var rep = REP_INFO[cmd.type];

  if (cmd.type === REP_HEADER_TABLE_SIZE) {
    return this._encodeHeaderTableSizeUpdate(cmd.size);
  }

  index = cmd.index || 0;
  buffers.push(this._encodeInteger(index, rep.prefix));
  buffers[0][0] |= rep.mask;

  if (cmd.type !== REP_INDEXED) {
    if (cmd.name) {
      buffers.push(this._encodeString(cmd.name));
    }
    buffers.push(this._encodeString(cmd.value));
  }

  return Buffer.concat(buffers);
};

Context.prototype._encodeInteger = function (num, prefix) {
  var limit = Math.pow(2, prefix) - 1;

  if (num < limit) {
    return new Buffer([num]);
  }

  var octets = [limit];
  num -= limit;
  while (num >= 128) {
    octets.push(num % 128 | 0x80);
    num >>= 7;
  }
  octets.push(num);

  return new Buffer(octets);
};

Context.prototype._encodeString = function (str) {
  var buffers = [];
  var value = new Buffer(str, 'ascii');

  if (this.huffman) {
    value = this._huffmanTable.encode(value);
    buffers.push(this._encodeInteger(value.length, 7));
    buffers[0][0] |= 0x80;
  } else {
    buffers.push(this._encodeInteger(value.length, 7));
  }
  buffers.push(value);

  return Buffer.concat(buffers);
};

Context.prototype._encodeHeaderTableSizeUpdate = function (size) {
  var buffer;
  var rep = REP_INFO[REP_HEADER_TABLE_SIZE];

  buffer = this._encodeInteger(size, rep.prefix);
  buffer[0] |= rep.mask;

  return buffer;
};

Context.prototype._decodeHeader = function (buffer) {
  var cmd = {};

  cmd.type = this._detectRepresentationType(buffer);
  var rep = REP_INFO[cmd.type];

  if (cmd.type === REP_HEADER_TABLE_SIZE) {
    cmd.size = this._decodeHeaderTableSizeUpdate(buffer);
    return cmd;
  }

  var index = this._decodeInteger(buffer, rep.prefix);
  if (cmd.type === REP_INDEXED) {
    if (index !== 0) {
      cmd.index = index;
    }
  } else {
    if (index !== 0) {
      cmd.index = index;
    } else {
      cmd.name = this._decodeString(buffer);
    }

    cmd.value = this._decodeString(buffer);
  }

  return cmd;
};

Context.prototype._detectRepresentationType = function (buffer) {
  var idx, len, rep = null;
  var bytes = buffer[buffer._cursor];

  var order = [
    REP_INDEXED,
    REP_LITERAL_INCR,
    REP_HEADER_TABLE_SIZE,
    REP_LITERAL_NEVER,
    REP_LITERAL
  ];

  for (idx=0, len=order.length; idx<len; idx++) {
    var current = order[idx];
    if (bytes >= REP_INFO[current].mask) {
      rep = current;
      break;
    }
  }

  if (rep === null) {
    throw new Error('Unkown representation');
  }

  return rep;
};

Context.prototype._decodeInteger = function (buffer, prefix) {
  var limit = Math.pow(2, prefix) - 1;
  var shift = 0;
  var value = 0;

  value = buffer[buffer._cursor] & limit;
  buffer._cursor++;

  if (value === limit) {
    do {
      value += (buffer[buffer._cursor] & 0x7F) << shift;
      shift += 7;
      buffer._cursor++;
    } while (buffer[buffer._cursor-1] & 0x80);
  }

  return value;
};

Context.prototype._decodeString = function (buffer) {
  var str = '';
  var huffman = (buffer[buffer._cursor] & 0x80) ? true : false;
  var length = this._decodeInteger(buffer, 7);

  var value = buffer.slice(buffer._cursor, buffer._cursor+length);
  if (huffman) {
    str = this._huffmanTable.decode(value);
  } else {
    str = value.toString('ascii');
  }
  buffer._cursor += length;

  return str;
};

Context.prototype._decodeHeaderTableSizeUpdate = function (buffer) {
  var rep = REP_INFO[REP_HEADER_TABLE_SIZE];
  var size = this._decodeInteger(buffer, rep.prefix);

  return size;
};


// ========================================================
// Exports
// ========================================================
exports.createContext = function createRequestContext(options) {
  options = options || {};
  return new Context(options);
};
