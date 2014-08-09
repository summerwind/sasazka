var net = require('net'),
    tls = require('tls'),
    events = require('events'),
    util = require('util'),
    Readable = require('stream').Readable,
    Writable = require('stream').Writable;

var Connection = require('./connection'),
    protocol = require('./protocol');

var TLS_CIPHERS = [
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'DHE-RSA-AES128-GCM-SHA256',
  'DHE-DSS-AES128-GCM-SHA256',
  'ECDHE-RSA-AES128-SHA256',
  'ECDHE-ECDSA-AES128-SHA256',
  'ECDHE-RSA-AES128-SHA',
  'ECDHE-ECDSA-AES128-SHA',
  'ECDHE-RSA-AES256-SHA384',
  'ECDHE-ECDSA-AES256-SHA384',
  'ECDHE-RSA-AES256-SHA',
  'ECDHE-ECDSA-AES256-SHA',
  'DHE-RSA-AES128-SHA256',
  'DHE-RSA-AES128-SHA',
  'DHE-DSS-AES128-SHA256',
  'DHE-RSA-AES256-SHA256',
  'DHE-DSS-AES256-SHA',
  'DHE-RSA-AES256-SHA',
  'kEDH+AESGCM',
  'AES128-GCM-SHA256',
  'AES256-GCM-SHA384',
  'ECDHE-RSA-RC4-SHA',
  'ECDHE-ECDSA-RC4-SHA',
  '!aNULL',
  '!eNULL',
  '!EXPORT',
  '!DES',
  '!3DES',
  '!MD5',
  '!DSS',
  '!PSK'
];

// ==============================================
// Common functions
// ==============================================
function array2hash (array) {
  var hash = {};

  for (var idx=0, len=array.length; idx<len; idx++) {
    var name = array[idx][0];
    var value = array[idx][1];

    if (hash[name]) {
      if (!util.isArray(hash[name])) {
        hash[name] = [ hash[name] ];
      }
      hash[name].push(value);
    } else {
      hash[name] = value;
    }
  }

  return hash;
}


// ==============================================
// Imcoming Message
// ==============================================
function IncomingMessage (conn, stream) {
  var self = this;

  Readable.call(this);

  this.httpVersion = '2.0';
  this.httpVersionMajor = 2;
  this.httpVersionMinor = 0;

  this.headers = {};
  this.trailers = {};
  this.method = null;
  this.url = null;
  this.statusCode = null;

  this.authority = null;
  this.tls = false;

  this.socket = conn.socket;
  this.connection = conn;
  this.stream = stream;

  this.stream.on('data', function (chunk) {
    self.push(chunk);
  });

  this.stream.once('cancel', function () {
    self._disable();
    self.emit('cancel');
  });

  this.stream.once('end', function () {
    self.push(null);
  });
}

util.inherits(IncomingMessage, Readable);

IncomingMessage.prototype.setTimeout = function (msecs, callback) {
  this.connection.setTimeout(msecs, callback);
};

IncomingMessage.prototype._read = function () {
  // Nothing to do.
};

IncomingMessage.prototype._disable = function () {
  var dummy = function () {};
  this.write = dummy;
  this.end = dummy;
};


// ==============================================
// Outgoing Message
// ==============================================
function OutgoingMessage (conn, stream) {
  Writable.call(this);

  this.connection = conn;
  this.stream = stream;
  this.stream.once('cancel', this._streamCancelHandler());
}

util.inherits(OutgoingMessage, Writable);

OutgoingMessage.prototype.setTimeout = function (msecs, callback) {
  this.connection.setTimeout(msecs, callback);
};

OutgoingMessage.prototype.cancel = function () {
  this._disable();
  this.stream.cancel();
};

OutgoingMessage.prototype._write = function (chunk, encoding, callback) {
  this.stream.sendDataFrame(chunk);

  process.nextTick(function(){
    callback();
  });
};

OutgoingMessage.prototype.end = function (chunk, encoding) {
  this.stream.sendDataFrame(chunk, { endStream: true });
  Writable.prototype.end.call(this);
};

OutgoingMessage.prototype._streamCancelHandler = function () {
  var self = this;

  return function () {
    self._disable();
  };
};

OutgoingMessage.prototype._disable = function () {
  var dummy = function () {};
  this.write = dummy;
  this.end = dummy;
};


// ==============================================
// Server Response
// ==============================================
function ServerResponse (conn, stream) {
  OutgoingMessage.call(this, conn, stream);

  this.statusCode = 200;
  this.statusMessage = null;
  this.sendDate = true;
  this.headersSent = false;

  this.request = null;

  this._headers = {};
  this._trailers = {};
}

util.inherits(ServerResponse, OutgoingMessage);

ServerResponse.prototype.writeContinue = function () {

};

ServerResponse.prototype.writeHead = function (statusCode, reasonPhrase, headers) {
  var name;

  if (typeof arguments[1] !== 'string') {
    headers = reasonPhrase;
    reasonPhrase = '';
  }

  this.statusCode = statusCode;
  this.statusMessage = reasonPhrase;

  for (name in headers) {
    this._headers[name.toLowerCase()] = headers[name];
  }

  if (this.sendDate && !this._headers.hasOwnProperty('date')) {
    this._headers.date = (new Date()).toUTCString();
  }

  var payloadHeaders = [
    [ ':status', this.statusCode.toString() ]
  ];

  for (name in this._headers) {
    var value = this._headers[name];
    payloadHeaders.push([name, value]);
  }

  this.stream.sendHeadersFrame(payloadHeaders, { endHeaders: true });
  this.headersSent = true;
};

ServerResponse.prototype.setHeader = function (name, value) {
  this._headers[name.toLowerCase()] = value;
};

ServerResponse.prototype.getHeader = function (name) {
  return this._headers[name.toLowerCase()];
};

ServerResponse.prototype.removeHeader = function (name) {
  delete this._headers[name.toLowerCase()];
};

ServerResponse.prototype.addTrailers = function () {

};

ServerResponse.prototype.push = function (path, headers, callback) {
  if (typeof arguments[1] === 'function') {
    callback = headers;
    headers = {};
  }

  var options = {
    endHeaders: true
  };

  var payloadHeaders = [
    [':method', 'GET']
  ];

  payloadHeaders.push([':scheme', (this.request.tls ? 'https' : 'http')]);
  if (this.request.authority || headers[':authority']) {
    var authority = this.request.authority || headers[':authority'];
    payloadHeaders.push([':authority', authority]);
  }
  payloadHeaders.push([':path', path]);

  for (var name in headers) {
    var value = headers[name];
    payloadHeaders.push([name, value]);
  }

  var promisedStream = this.connection.createStream(true);
  if (!promisedStream) {
    return false;
  }
  this.stream.sendPushPromiseFrame(promisedStream.id, payloadHeaders, options);

  var reqHeaders = array2hash(payloadHeaders);

  var req = new IncomingMessage(this.connection, promisedStream);
  req.method = reqHeaders[':method'];
  req.url = reqHeaders[':path'];
  req.authority = reqHeaders[':authority'];
  req.tls = (reqHeaders[':scheme'] === 'https');
  req.headers = reqHeaders;

  var res = new ServerResponse(this.connection, promisedStream);
  res.request = req;

  process.nextTick(function(){
    callback(req, res);
  });

  return true;
};

ServerResponse.prototype._write = function (chunk, encoding, callback) {
  if (!this.headersSent) {
    this.writeHead(this.statusCode);
  }
  OutgoingMessage.prototype._write.call(this, chunk, encoding, callback);
};

ServerResponse.prototype.end = function (chunk, encoding) {
  if (!this.headersSent) {
    this.writeHead(this.statusCode);
  }
  OutgoingMessage.prototype.end.call(this, chunk, encoding);
  this.emit('finish');
};


// ==============================================
// Server
// ==============================================
function Server (options, requestHandler) {
  events.EventEmitter.call(this);

  if (typeof options === 'function') {
    requestHandler = options;
    options = {};
  }

  this.timeout = 120 * 1000;
  this.maxHeadersCount = 1000;

  this.headerTableSize = protocol.DEFAULT_HEADER_TABLE_SIZE;
  this.maxConcurrentStreams = protocol.DEFAULT_MAX_CONCURRENT_STREAMS;
  this.initialWindowSize = protocol.DEFAULT_INITIAL_WINDOW_SIZE;

  this.setHeaderTableSize(options.headerTableSize);
  this.setMaxConcurrentStreams(options.maxConcurrentStreams);
  this.setInitialWindowSize(options.initialWindowSize);

  if (options.key && options.cert) {
    options.NPNProtocols = [ protocol.IDENTIFIER ];
    options.ciphers = TLS_CIPHERS.join(':');
    options.honorCipherOrder = true;

    this._server = tls.createServer(options, this._connectionHandler());
    this.tls = true;
  } else {
    this._server = net.createServer(this._connectionHandler());
    this.tls = false;
  }

  if (requestHandler) {
    this.on('request', requestHandler);
  }
}

util.inherits(Server, events.EventEmitter);

Server.prototype.listen = function (/* args */) {
  this._server.listen.apply(this._server, arguments);
};

Server.prototype.close = function (callback) {
  this._server.close(callback);
};

Server.prototype.setTimeout = function (msecs, callback) {
  this._server.setTimeout.apply(msecs, callback);
};

Server.prototype.setHeaderTableSize = function (value) {
  if (value && (typeof value === 'number') && value >= 0) {
    this.headerTableSize = value;
  }
};

Server.prototype.setMaxConcurrentStreams = function (value) {
  if (value && (typeof value === 'number') && value >= 0) {
    this.maxConcurrentStreams = value;
  }
};

Server.prototype.setInitialWindowSize = function (value) {
  if (value && (typeof value === 'number') && value >= 0) {
    this.initialWindowSize = value;
  }
};

Server.prototype._connectionHandler = function () {
  var self = this;

  return function (socket) {
    if (self.tls && socket.npnProtocol.indexOf(protocol.IDENTIFIER) === -1) {
      return socket.destroy();
    }

    var options = {
      headerTableSize: self.headerTableSize,
      maxConcurrentStreams: self.maxConcurrentStreams,
      initialWindowSize: self.initialWindowSize
    };

    var conn = new Connection(socket, options, true);
    conn.on('stream', self._streamHandler());
  };
};

Server.prototype._streamHandler = function () {
  var self = this;

  return function (stream) {
    var conn = this;

    stream.on('header', function (streamHeaders) {
      var headers = array2hash(streamHeaders);

      var req = new IncomingMessage(conn, stream);
      req.method = headers[':method'];
      req.url = headers[':path'];
      req.authority = headers[':authority'];
      req.tls = (headers[':scheme'] === 'https');
      req.headers = headers;

      var res = new ServerResponse(conn, stream);
      res.request = req;

      setImmediate(function(){
        self.emit('request', req, res);
      });
    });
  };
};


exports.createServer = function (options, reqHandler) {
  return new Server(options, reqHandler);
};
