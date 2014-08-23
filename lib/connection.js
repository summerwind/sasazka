var util = require('util');

var FlowController = require('./flow_controller'),
    Stream = require('./stream'),
    Serializer = require('./serializer'),
    Deserializer = require('./deserializer'),
    hpack = require('./hpack'),
    framer = require('./framer'),
    protocol = require('./protocol');

var SETTINGS_ACK_TIMEOUT = 30 * 1000; // 30s


function ConnectionSettings() {
  this.headerTableSize = protocol.DEFAULT_HEADER_TABLE_SIZE;
  this.enablePush = protocol.DEFAULT_ENABLE_PUSH;
  this.maxConcurrentStreams = protocol.DEFAULT_MAX_CONCURRENT_STREAMS;
  this.initialWindowSize = protocol.DEFAULT_INITIAL_WINDOW_SIZE;
}


function Connection(socket, settings, server) {
  FlowController.call(this);

  this.closed = false;
  this._server = (server === true);

  this._streams = [];
  this._lastStreamId = 0;
  this._nextCleanupId = 1;

  this._localSettings = new ConnectionSettings();
  this._remoteSettings = new ConnectionSettings();
  this._pendingSettings = [];
  this._settingsTimers = [];

  this._localStreams = 0;
  this._remoteStreams = 0;

  this.socket = socket;
  this.socket.once('end', this._socketEndHandler());
  this.socket.once('close', this._socketCloseHandler());
  this.socket.once('error', this._socketErrorHandler());
  this.socket.once('timeout', this._socketTimeoutHandler());

  this._compressor = hpack.createContext();
  this._decompressor = hpack.createContext();

  this._serializer = new Serializer();
  this._deserializer = new Deserializer();

  if (this._server) {
    this._setupServerConnection(settings);
  } else {
    this._setupClientConnection(settings);
  }
}

util.inherits(Connection, FlowController);

Connection.prototype._setupClientConnection = function(settings) {
  var self = this;

  this._streamId = 1;
  this.socket.on('connect', function() {
    self._setupPipeline();

    self.socket.write(protocol.CONNECTION_PREFACE);
    self.sendSettingsFrame(settings);

    self.emit('connect');
  });
};

Connection.prototype._setupServerConnection = function(settings) {
  this._streamId = 2;
  this.socket.once('readable', this._connectionPrefaceHandler(settings));
};

Connection.prototype._setupPipeline = function() {
  this._serializer.pipe(this.socket).pipe(this._deserializer);
  this._deserializer.on('data', this._frameHandler());
};

Connection.prototype.createStream = function(id, promised) {
  var self = this;

  if (typeof id === 'boolean') {
    promised = id;
    id = undefined;
  }
  promised = (promised === true) ? true : false;

  if (promised && !this._remoteSettings.enablePush) {
    return null;
  }

  if (!id) {
    id = this._streamId;
    this._streamId += 2;
  }

  if (this._streams[id]) {
    var errorCode = protocol.CODE_PROTOCOL_ERROR;
    this.sendGoawayFrame(errorCode);
    this._error(errorCode);
    return null;
  }

  var isServerStream = (id % 2 === 0);
  var stream = new Stream({
    id: id,
    promised: promised,
    initialWindowSize: this._remoteSettings.initialWindowSize,
    compressor: this._compressor,
    decompressor: this._decompressor
  });

  stream.on('send', function (frame) {
    self.push(frame);
  });

  stream.on('active', function () {
    if (self._server === isServerStream) {
      self._localStreams++;
    } else {
      self._remoteStreams++;
    }
  });

  stream.on('close', function () {
    if (self._server === isServerStream) {
      self._localStreams--;
    } else {
      self._remoteStreams--;
    }
  });

  stream.on('error', function (err, connectionError) {
    if (connectionError) {
      self.sendGoawayFrame(err);
      self._error(err);
    }
  });

  this._streams[stream.id] = stream;
  setImmediate(function(){
    self.emit('stream', stream);
  });

  var refuse = false;
  if (isServerStream) {
    if (self._localStreams > self._remoteSettings.maxConcurrentStreams) {
      refuse = true;
    }
  } else {
    if (self._remoteStreams > self._localSettings.maxConcurrentStreams) {
      refuse = true;
    }
  }

  if (refuse) {
    stream.sendRstStreamFrame(protocol.REFUSED_STREAM);
  }

  this._cleanupStream();

  return stream;
};

Connection.prototype._cleanupStream = function () {
  var maxStreams = 50;

  if (this._streams.length > maxStreams && (this._streams.length % 20 === 0)) {
    var idx = this._nextCleanupId;
    while (this._streams[idx].closed) {
      this._streams[idx] = false;
      idx++;
      console.log('Cleanup:', idx);
    }

    this._nextCleanupId = idx;
  }
};

Connection.prototype.setTimeout = function(timeout, callback) {
  this.socket.setTimeout(timeout);

  if (callback) {
    this.once('timeout', callback);
  }
};

Connection.prototype.setHeaderTableSize = function(headerTableSize) {
  this.sendSettingsFrame({ headerTableSize: headerTableSize });
};

Connection.prototype.setEnablePush = function(enablePush) {
  this.sendSettingsFrame({ enablePush: enablePush });
};

Connection.prototype.setMaxConcurrentStreams = function(maxConcurrentStreams) {
  this.sendSettingsFrame({ maxConcurrentStreams: maxConcurrentStreams });
};

Connection.prototype.setInitialWindowSize = function(initialWindowSize) {
  this.sendSettingsFrame({ initialWindowSize: initialWindowSize });
};

Connection.prototype.ping = function() {
  this.sendPingFrame();
};

Connection.prototype.destroy = function() {
  this.sendGoawayFrame();
  this.socket.destroy();
  this._close();
};

Connection.prototype.sendSettingsFrame = function(settings, ack) {
  var self = this;

  if (typeof settings === 'boolean') {
    ack = settings;
    settings = {};
  } else if(settings === undefined) {
    settings = {};
  }

  var frame = framer.createSettingsFrame();

  if (ack === true) {
    frame.ack = true;
  } else {
    for (var param in settings) {
      var method = 'set' + param[0].toUpperCase() + param.slice(1);
      if (typeof frame[method] === 'function') {
        frame[method](settings[param]);
      }
    }
    this._pendingSettings.push(settings);

    var timer = setTimeout(function(){
      var errorCode = protocol.CODE_SETTINGS_TIMEOUT;
      self.sendGoawayFrame(errorCode);
      self._error(errorCode);
    }, SETTINGS_ACK_TIMEOUT);
    this._settingsTimers.push(timer);
  }

  this.push(frame);
};

Connection.prototype.sendGoawayFrame = function(errorCode) {
  if (!errorCode) {
    errorCode = protocol.CODE_NO_ERROR;
  }

  var frame = framer.createGoawayFrame();
  frame.setLastStreamId(this._lastStreamId);
  frame.setErrorCode(errorCode);

  this.push(frame);
};

Connection.prototype.sendPingFrame = function(opaqueData) {
  var frame = framer.createPingFrame();
  if (opaqueData) {
    frame.setOpaqueData(opaqueData);
  }
  this.push(frame);
};

Connection.prototype._send = function(frame) {
  this._serializer.write(frame);
};

Connection.prototype._process = function(frame) {
  var code = protocol.CODE_NO_ERROR;

  switch (frame.type) {
    case protocol.FRAME_TYPE_DATA:
    case protocol.FRAME_TYPE_HEADERS:
    case protocol.FRAME_TYPE_PRIORITY:
    case protocol.FRAME_TYPE_RST_STREAM:
    case protocol.FRAME_TYPE_PUSH_PROMISE:
    case protocol.FRAME_TYPE_CONTINUATION:
      code = protocol.CODE_PROTOCOL_ERROR;
      break;
    case protocol.FRAME_TYPE_GOAWAY:
      code = this._processGoawayFrame(frame);
      break;
    case protocol.FRAME_TYPE_SETTINGS:
      code = this._processSettingsFrame(frame);
      break;
    case protocol.FRAME_TYPE_PING:
      code = this._processPingFrame(frame);
      break;
    case protocol.FRAME_TYPE_WINDOW_UPDATE:
      code = this._processWindowUpdateFrame(frame);
      break;
  }

  if (code !== protocol.CODE_NO_ERROR) {
    this._error(code);
  }
};

Connection.prototype._processGoawayFrame = function(frame) {
  if (frame.errorCode === protocol.CODE_NO_ERROR) {
    this.socket.destroy();
    this._close();
  }

  return frame.errorCode;
};

Connection.prototype._processSettingsFrame = function(frame) {
  var newSettings, settings;

  if (frame.ack) {
    clearTimeout(this._settingsTimers.shift());
    newSettings = this._pendingSettings.shift();
    settings = this._localSettings;
  } else {
    this.sendSettingsFrame(true);
    newSettings = frame.getChangedParameters();
    settings = this._remoteSettings;
  }

  for (var param in newSettings) {
    var value = newSettings[param];

    switch (param) {
      case 'initialWindowSize':
        if (frame.ack) {
          this.updateInitialWindowSize(value);
        }
        break;
      case 'headerTableSize':
        if (frame.ack) {
          this._compressor.setHeaderTableSize(value);
        } else {
          this._decompressor.setHeaderTableSize(value);
        }
        break;
    }

    settings[param] = value;
  }

  return protocol.CODE_NO_ERROR;
};

Connection.prototype._processPingFrame = function(frame) {
  if (frame.ack) {
    var self = this;
    //setImmediate(function(){
      self.emit('ping');
    //});
  } else {
    frame.ack = true;
    this.push(frame);
  }

  return protocol.CODE_NO_ERROR;
};

Connection.prototype._processWindowUpdateFrame = function(frame) {
  this.increaseWindowSize(frame.windowSizeIncrement);
  return protocol.CODE_NO_ERROR;
};

Connection.prototype._close = function(hadError) {
  if (this.closed) {
    return;
  }

  this.closed = true;
  this._send = function() {};

  this.emit('close', hadError);
};

Connection.prototype._error = function(errorCode) {
  var self = this;

  var err = new Error();
  err.code = errorCode;

  this.emit('error', err);

  process.nextTick(function () {
    self._close(true);
  });
};

Connection.prototype._connectionPrefaceHandler = function(settings) {
  var self = this;

  return function () {
    var preface = self.socket.read(protocol.CONNECTION_PREFACE_LEN);

    if (!preface) {
      self.socket.once('readable', self._connectionPrefaceHandler());
      return;
    }

    if (preface.toString() === protocol.CONNECTION_PREFACE) {
      self._setupPipeline();
      self.sendSettingsFrame(settings);
      self.emit('connect');
    } else {
      self.socket.destroy();
    }
  };
};

Connection.prototype._frameHandler = function() {
  var self = this;

  return function (frame) {
    if (frame.streamId === 0) {
      self._process(frame);
      return;
    }

    var stream = self._streams[frame.streamId];
    if (!stream) {
      stream = self.createStream(frame.streamId);
      if (self._remoteStreams > self._localSettings.maxConcurrentStreams) {
        stream.sendRstStreamFrame(protocol.CODE_STREAM_ERROR);
        return;
      }
    }

    stream.process(frame);
    self._lastStreamId = stream.id;

    self.emit('frame', frame);
  };
};

Connection.prototype._socketEndHandler = function() {
  var self = this;

  return function () {
    self.emit('end');
  };
};

Connection.prototype._socketCloseHandler = function() {
  var self = this;

  return function (hadError) {
    self._close(hadError);
  };
};

Connection.prototype._socketErrorHandler = function() {
  var self = this;

  return function (err) {
    if (self.closed) {
      return;
    }
    self.emit('error', err);
  };
};

Connection.prototype._socketTimeoutHandler = function() {
  var self = this;

  return function () {
    self.emit('timeout');
  };
};


module.exports = Connection;
