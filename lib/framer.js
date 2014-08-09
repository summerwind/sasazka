var util = require('util');

var protocol = require('./protocol');

// ==============================================
// Generic Frame
// ==============================================
function Frame () {
  this.length = 0;
  this.streamId = 0;
}

Frame._decodeHeader = function (buffer) {
  return {
    length:   buffer.readUInt32BE(0) >> 8,
    type:     buffer.readUInt8(3),
    flags:    buffer.readUInt8(4),
    streamId: buffer.readUInt32BE(5)
  };
};

Frame.prototype.encode = function () {
  var header = this._encodeHeader();
  var payload = this._encodePayload();

  return Buffer.concat([header, payload]);
};

Frame.prototype._encodeHeader = function () {
  var buffer = new Buffer(protocol.FRAME_HEADER_LEN);

  buffer.writeUInt32BE(this.length << 8, 0);
  buffer.writeUInt8(this.type, 3);
  buffer.writeUInt8(this._encodeFlags(), 4);
  buffer.writeUInt32BE(this.streamId, 5);

  return buffer;
};


// ==============================================
// Generic Padding Frame
// ==============================================
function PaddingFrame () {
  Frame.call(this);

  this._padded = false;
  this.padding = null;
}

util.inherits(PaddingFrame, Frame);

PaddingFrame._decodePadding = function (frame, flags, buffer) {
  var offset = 0;

  if (flags & protocol.FLAG_PADDED) {
    frame._padded = true;
  }

  if (frame._padded) {
    frame.padding = buffer.readUInt8(0);
    offset += 1;
  }

  return offset;
};

PaddingFrame.prototype.encode = function () {
  var header = this._encodeHeader();
  var payload = this._encodePayload();
  payload = this._encodePaddingPayload(payload);

  return Buffer.concat([header, payload]);
};

PaddingFrame.prototype._encodeFlags = function () {
  var flags = protocol.FLAG_NONE;

  if (this._padded) {
    flags |= protocol.FLAG_PADDED;
  }

  return flags;
};

PaddingFrame.prototype._encodePaddingPayload = function (payload) {
  var length = new Buffer(0);
  var padding = new Buffer(0);

  if (this._padded) {
    length = new Buffer(1);
    length.writeUInt8(this.padding, 0);
  }

  if (this.padding !== null) {
    padding = new Buffer(this.padding);
    padding.fill(0);
  }

  return Buffer.concat([length, payload, padding]);
};

PaddingFrame.prototype.setPadding = function (padding) {
  if (padding > 255) {
    throw new Error('Padding is too large');
  }

  if (this._padded) {
    this._padded = false;
    this.length -= 1;
  }
  if (this.padding !== null && padding !== null) {
    this.length -= this.padding;
  }

  if (padding !== null) {
    this._padded = true;
    this.length += (1 + padding);
  }

  this.padding = padding;
};


// ==============================================
// DATA Frame
// ==============================================
function DataFrame () {
  PaddingFrame.call(this);

  this.type = protocol.FRAME_TYPE_DATA;

  this.endStream = false;
  this.endSegment = false;

  this.data = null;
}

util.inherits(DataFrame, PaddingFrame);

DataFrame.decode = function (header, buffer) {
  var frame = new DataFrame();
  var offset = 0;

  frame.length = header.length;
  frame.streamId = header.streamId;

  if (header.flags & protocol.FLAG_END_STREAM) {
    frame.endStream = true;
  }
  if (header.flags & protocol.FLAG_END_SEGMENT) {
    frame.endSegment = true;
  }

  offset += PaddingFrame._decodePadding(frame, header.flags, buffer);

  var padding = frame.padding || 0;
  frame.data = buffer.slice(offset, frame.length - padding);

  return frame;
};

DataFrame.prototype._encodeFlags = function () {
  var flags = PaddingFrame.prototype._encodeFlags.call(this);

  if (this.endStream) {
    flags |= protocol.FLAG_END_STREAM;
  }
  if (this.endSegment) {
    flags |= protocol.FLAG_END_SEGMENT;
  }

  return flags;
};

DataFrame.prototype._encodePayload = function () {
  return (this.data) ? this.data : new Buffer(0);
};

DataFrame.prototype.setData = function (data) {
  if (!data) {
    return;
  }

  if (typeof data === 'string') {
    data = new Buffer(data);
  }

  if (this.data !== null) {
    this.length -= this.data.length;
  }

  this.data = data;
  this.length += this.data.length;
};


// ==============================================
// HEADERS Frame
// ==============================================
function HeadersFrame () {
  PaddingFrame.call(this);

  this.type = protocol.FRAME_TYPE_HEADERS;

  this.endStream = false;
  this.endHeaders = false;
  this.priority = false;

  this.exclusive = null;
  this.streamDependency = null;
  this.weight = null;

  this.headerBlockFragment = null;
  this.headers = null;
}

util.inherits(HeadersFrame, PaddingFrame);

HeadersFrame.decode = function (header, buffer) {
  var frame = new HeadersFrame();
  var offset = 0;

  frame.length = header.length;
  frame.streamId = header.streamId;

  if (header.flags & protocol.FLAG_END_STREAM) {
    frame.endStream = true;
  }
  if (header.flags & protocol.FLAG_END_HEADERS) {
    frame.endHeaders = true;
  }
  if (header.flags & protocol.FLAG_PRIORITY) {
    frame.priority = true;
  }

  offset += PaddingFrame._decodePadding(frame, header.flags, buffer);

  if (frame.priority) {
    var streamDependency = buffer.readUInt32BE(offset);
    offset += 4;

    frame.exclusive = (streamDependency & 0x80000000) ? true : false;
    frame.streamDependency = (streamDependency & 0x7FFFFFFF);

    frame.weight = buffer.readUInt8(offset);
    offset += 1;
  }

  var padding = frame.padding || 0;
  frame.headerBlockFragment = buffer.slice(offset, frame.length - padding);

  return frame;
};

HeadersFrame.prototype._encodeFlags = function () {
  var flags = PaddingFrame.prototype._encodeFlags.call(this);

  if (this.endStream) {
    flags |= protocol.FLAG_END_STREAM;
  }
  if (this.endHeaders) {
    flags |= protocol.FLAG_END_HEADERS;
  }
  if (this.priority) {
    flags |= protocol.FLAG_PRIORITY;
  }

  return flags;
};

HeadersFrame.prototype._encodePayload = function () {
  var buffers = [];

  if (this.priority) {
    var buffer = new Buffer(5);

    var mask = 0x0;
    if (this.exclusive) {
      mask = 0x80000000;
    }

    buffer.writeUInt32BE(this.streamDependency + mask, 0);
    buffer.writeUInt8(this.weight, 4);
    buffers.push(buffer);
  }

  buffers.push(this.headerBlockFragment);

  return Buffer.concat(buffers);
};

HeadersFrame.prototype.setPriority = function (dependency, weight, exclusive) {
  if (arguments[0] === null) {
    this.priority = false;
    this.length -= 5;

    this.exclusive = null;
    this.streamDependency = null;
    this.weight = null;
  }

  if (!this.priority) {
    this.priority = true;
    this.length += 5;
  }

  this.exclusive = (exclusive === true) ? true : false;
  this.streamDependency = dependency;
  this.weight = weight;
};

HeadersFrame.prototype.setHeaderBlockFragment = function (headerBlock) {
  if (this.headerBlockFragment !== null) {
    this.length -= this.headerBlockFragment.length;
  }

  this.headerBlockFragment = headerBlock;
  this.length += headerBlock.length;
};

HeadersFrame.prototype.setHeaders = function (headers) {
  this.headers = headers;
};


// ==============================================
// PRIORITY Frame
// ==============================================
function PriorityFrame () {
  Frame.call(this);
  this.type = protocol.FRAME_TYPE_PRIORITY;
  this.length = 5;

  this.exclusive = null;
  this.streamDependency = null;
  this.weight = null;
}

util.inherits(PriorityFrame, Frame);

PriorityFrame.decode = function (header, buffer) {
  var frame = new PriorityFrame();

  frame.length = header.length;
  frame.streamId = header.streamId;

  var streamDependency = buffer.readUInt32BE(0);

  frame.exclusive = (streamDependency & 0x80000000) ? true : false;
  frame.streamDependency = (streamDependency & 0x7FFFFFFF);

  frame.weight = buffer.readUInt8(4);

  return frame;
};

PriorityFrame.prototype._encodeFlags = function () {
  return protocol.FLAG_NONE;
};

PriorityFrame.prototype._encodePayload = function () {
  var buffer = new Buffer(5);

  var mask = 0x0;
  if (this.exclusive) {
    mask = 0x80000000;
  }

  buffer.writeUInt32BE(this.streamDependency + mask, 0);
  buffer.writeUInt8(this.weight, 4);

  return buffer;
};

PriorityFrame.prototype.setPriority = function (dependency, weight, exclusive) {
  this.exclusive = (exclusive === true) ? true : false;
  this.streamDependency = dependency;
  this.weight = weight;
};


// ==============================================
// RST_STREAM Frame
// ==============================================
function RstStreamFrame () {
  Frame.call(this);
  this.type = protocol.FRAME_TYPE_RST_STREAM;
  this.length = 4;
  this.errorCode = protocol.CODE_NO_ERROR;
}

util.inherits(RstStreamFrame, Frame);

RstStreamFrame.decode = function (header, buffer) {
  var frame = new RstStreamFrame();
  var offset = 0;

  frame.length = header.length;
  frame.streamId = header.streamId;

  frame.errorCode = buffer.readUInt32BE(offset);

  return frame;
};

RstStreamFrame.prototype._encodeFlags = function () {
  return protocol.FLAG_NONE;
};

RstStreamFrame.prototype._encodePayload = function () {
  var buffer = new Buffer(4);
  buffer.writeUInt32BE(this.errorCode, 0);

  return buffer;
};

RstStreamFrame.prototype.setErrorCode = function (errorCode) {
  this.errorCode = errorCode;
};


// ==============================================
// SETTINGS Frame
// ==============================================
function SettingsFrame () {
  Frame.call(this);

  this.type = protocol.FRAME_TYPE_SETTINGS;

  this.ack = false;

  this.headerTableSize = protocol.DEFAULT_HEADER_TABLE_SIZE;
  this.enablePush = protocol.DEFAULT_ENABLE_PUSH;
  this.maxConcurrentStreams = protocol.DEFAULT_MAX_CONCURRENT_STREAMS;
  this.initialWindowSize = protocol.DEFAULT_INITIAL_WINDOW_SIZE;

  this._changed = {};
}

util.inherits(SettingsFrame, Frame);

SettingsFrame.decode = function (header, buffer) {
  var frame = new SettingsFrame();
  var offset = 0;

  frame.length = header.length;
  frame.streamId = header.streamId;

  if (header.flags & protocol.FLAG_ACK) {
    frame.ack = true;
  }

  while (buffer.length > offset) {
    var identifier = buffer.readUInt16BE(offset);
    offset += 2;

    var value = buffer.readUInt32BE(offset);
    offset += 4;

    switch (identifier) {
      case protocol.SETTINGS_HEADER_TABLE_SIZE:
        frame.headerTableSize = value;
        frame._changed.headerTableSize = true;
        break;
      case protocol.SETTINGS_ENABLE_PUSH:
        frame.enablePush = (value === 1) ? true : false;
        frame._changed.enablePush = true;
        break;
      case protocol.SETTINGS_MAX_CONCURRENT_STREAMS:
        frame.maxConcurrentStreams = value;
        frame._changed.maxConcurrentStreams = true;
        break;
      case protocol.SETTINGS_INITIAL_WINDOW_SIZE:
        frame.initialWindowSize = value;
        frame._changed.initialWindowSize = true;
        break;
    }
  }

  return frame;
};

SettingsFrame.prototype._encodeFlags = function () {
  var flags = protocol.FLAG_NONE;

  if (this.ack) {
    flags |= protocol.FLAG_ACK;
  }

  return flags;
};

SettingsFrame.prototype._encodePayload = function () {
  var buffers = [];

  for (var param in this._changed) {
    if (!this._changed[param]) {
      continue;
    }

    var buffer = new Buffer(6);
    var identifier, value;

    switch (param) {
      case 'headerTableSize':
        identifier = protocol.SETTINGS_HEADER_TABLE_SIZE;
        value = this[param];
        break;
      case 'enablePush':
        identifier = protocol.SETTINGS_ENABLE_PUSH;
        value = this[param] ? 1 : 0;
        break;
      case 'maxConcurrentStreams':
        identifier = protocol.SETTINGS_MAX_CONCURRENT_STREAMS;
        value = this[param];
        break;
      case 'initialWindowSize':
        identifier = protocol.SETTINGS_INITIAL_WINDOW_SIZE;
        value = this[param];
        break;
    }

    buffer.writeUInt16BE(identifier, 0);
    buffer.writeUInt32BE(value, 2);
    buffers.push(buffer);
  }

  return Buffer.concat(buffers);
};

SettingsFrame.prototype._setParameter = function (param, value, defaultValue) {
  var changed = (this[param] !== value);
  var alreadyChanged = (this[param] !== defaultValue);

  if (changed) {
    this[param] = value;
    this._changed[param] = true;

    if (!alreadyChanged) {
      this.length += 6;
    }
  }
};

SettingsFrame.prototype.setHeaderTableSize = function (value) {
  var param = 'headerTableSize';
  var defaultValue = protocol.DEFAULT_HEADER_TABLE_SIZE;
  this._setParameter(param, value, defaultValue);
};

SettingsFrame.prototype.setEnablePush = function (value) {
  var param = 'enablePush';
  var defaultValue = protocol.DEFAULT_ENABLE_PUSH;
  this._setParameter(param, value, defaultValue);
};

SettingsFrame.prototype.setMaxConcurrentStreams = function (value) {
  var param = 'maxConcurrentStreams';
  var defaultValue = protocol.DEFAULT_MAX_CONCURRENT_STREAMS;
  this._setParameter(param, value, defaultValue);
};

SettingsFrame.prototype.setInitialWindowSize = function (value) {
  var param = 'initialWindowSize';
  var defaultValue = protocol.DEFAULT_INITIAL_WINDOW_SIZE;
  this._setParameter(param, value, defaultValue);
};

SettingsFrame.prototype.getChangedParameters = function () {
  var changedParams = {};

  for (var param in this._changed) {
    changedParams[param] = this[param];
  }

  return changedParams;
};


// ==============================================
// PUSH_PROMISE Frame
// ==============================================
function PushPromiseFrame () {
  PaddingFrame.call(this);

  this.type = protocol.FRAME_TYPE_PUSH_PROMISE;
  this.length = 4;

  this.endHeaders = false;

  this.promisedStreamId = 0;
  this.headerBlockFragment = null;
  this.headers = null;
}

util.inherits(PushPromiseFrame, PaddingFrame);

PushPromiseFrame.decode = function (header, buffer) {
  var frame = new PushPromiseFrame();
  var offset = 0;

  frame.length = header.length;
  frame.streamId = header.streamId;

  if (header.flags & protocol.FLAG_END_HEADERS) {
    frame.endHeaders = true;
  }

  offset += PaddingFrame._decodePadding(frame, header.flags, buffer);

  frame.promisedStreamId = buffer.readUInt32BE(offset) & 0x7FFFFFFF;
  offset += 4;

  var padding = frame.padding || 0;
  frame.headerBlockFragment = buffer.slice(offset, frame.length - padding);

  return frame;
};

PushPromiseFrame.prototype._encodeFlags = function () {
  var flags = PaddingFrame.prototype._encodeFlags.call(this);

  if (this.endHeaders) {
    flags |= protocol.FLAG_END_HEADERS;
  }

  return flags;
};

PushPromiseFrame.prototype._encodePayload = function () {
  var buffer = new Buffer(4);
  buffer.writeUInt32BE(this.promisedStreamId & 0x7FFFFFFF, 0);

  return Buffer.concat([buffer, this.headerBlockFragment]);
};

PushPromiseFrame.prototype.setPromisedStreamId = function (promisedStreamId) {
  this.promisedStreamId = promisedStreamId;
};

PushPromiseFrame.prototype.setHeaderBlockFragment = function (headerBlock) {
  if (this.headerBlockFragment !== null) {
    this.length -= this.headerBlockFragment.length;
  }

  this.headerBlockFragment = headerBlock;
  this.length += headerBlock.length;
};

PushPromiseFrame.prototype.setHeaders = function (headers) {
  this.headers = headers;
};


// ==============================================
// PING Frame
// ==============================================
function PingFrame () {
  Frame.call(this);

  this.type = protocol.FRAME_TYPE_PING;
  this.length = 8;

  this.ack = false;

  this.opaqueData = new Buffer(8);
  this.opaqueData.fill(0);
}

util.inherits(PingFrame, Frame);

PingFrame.decode = function (header, buffer) {
  var frame = new PingFrame();

  frame.length = header.length;
  frame.streamId = header.streamId;

  if (header.flags & protocol.FLAG_ACK) {
    frame.ack = true;
  }

  frame.opaqueData = buffer.slice(0, 8);

  return frame;
};

PingFrame.prototype._encodeFlags = function () {
  var flags = protocol.FLAG_NONE;

  if (this.ack) {
    flags |= protocol.FLAG_ACK;
  }

  return flags;
};

PingFrame.prototype._encodePayload = function () {
  return this.opaqueData.slice(0, 8);
};

PingFrame.prototype.setOpaqueData = function (opaqueData) {
  if (!opaqueData) {
    return;
  }

  if (typeof opaqueData === 'string') {
    this.opaqueData = new Buffer(8);
    this.opaqueData.fill(0);
    this.opaqueData.write(opaqueData);
  } else {
    this.opaqueData = opaqueData;
  }
};


// ==============================================
// GOAWAY Frame
// ==============================================
function GoawayFrame () {
  Frame.call(this);

  this.type = protocol.FRAME_TYPE_GOAWAY;
  this.length = 8;

  this.lastStreamId = 0;
  this.errorCode = protocol.CODE_NO_ERROR;
  this.debugData = null;
}

util.inherits(GoawayFrame, Frame);

GoawayFrame.decode = function (header, buffer) {
  var frame = new GoawayFrame();
  var offset = 0;

  frame.length = header.length;
  frame.streamId = header.streamId;

  frame.lastStreamId = buffer.readUInt32BE(offset);
  offset += 4;
  frame.errorCode = buffer.readUInt32BE(offset);
  offset += 4;

  if (offset !== buffer.length) {
    frame.debugData = buffer.slice(offset);
  }

  return frame;
};

GoawayFrame.prototype._encodeFlags = function () {
  return protocol.FLAG_NONE;
};

GoawayFrame.prototype._encodePayload = function () {
  var buffers = [];

  var payload = new Buffer(8);
  payload.writeUInt32BE(this.lastStreamId, 0);
  payload.writeUInt32BE(this.errorCode, 4);
  buffers.push(payload);

  if (this.debugData) {
    buffers.push(this.debugData);
  }

  return Buffer.concat(buffers);
};

GoawayFrame.prototype.setLastStreamId = function (lastStreamId) {
  this.lastStreamId = lastStreamId;
};

GoawayFrame.prototype.setErrorCode = function (errorCode) {
  this.errorCode = errorCode;
};

GoawayFrame.prototype.setDebugData = function (debugData) {
  if (!debugData) {
    return;
  }

  if (typeof debugData === 'string') {
    debugData = new Buffer(debugData);
  }

  this.debugData = debugData;
  this.length += debugData.length;
};


// ==============================================
// WINDOW_UPDATE Frame
// ==============================================
function WindowUpdateFrame () {
  Frame.call(this);

  this.type = protocol.FRAME_TYPE_WINDOW_UPDATE;
  this.length = 4;

  this.windowSizeIncrement = 0;
}

util.inherits(WindowUpdateFrame, Frame);

WindowUpdateFrame.decode = function (header, buffer) {
  var frame = new WindowUpdateFrame();

  frame.length = header.length;
  frame.streamId = header.streamId;
  frame.windowSizeIncrement = buffer.readUInt32BE(0);

  return frame;
};

WindowUpdateFrame.prototype._encodeFlags = function () {
  return protocol.FLAG_NONE;
};

WindowUpdateFrame.prototype._encodePayload = function () {
  var buffer = new Buffer(4);
  buffer.writeUInt32BE(this.windowSizeIncrement & 0x7FFFFFFF, 0);

  return buffer;
};

WindowUpdateFrame.prototype.setWindowSizeIncrement = function (increment) {
  this.windowSizeIncrement = increment;
};


// ==============================================
// CONTINUATION Frame
// ==============================================
function ContinuationFrame () {
  Frame.call(this);

  this.type = protocol.FRAME_TYPE_CONTINUATION;

  this.endHeaders = false;

  this.headerBlockFragment = null;
}

util.inherits(ContinuationFrame, Frame);

ContinuationFrame.decode = function (header, buffer) {
  var frame = new ContinuationFrame();
  var offset = 0;

  frame.length = header.length;
  frame.streamId = header.streamId;

  if (header.flags & protocol.FLAG_END_HEADERS) {
    frame.endHeaders = true;
  }

  var padding = frame.padding || 0;
  frame.headerBlockFragment = buffer.slice(offset, frame.length - padding);

  return frame;
};

ContinuationFrame.prototype._encodeFlags = function () {
  var flags = protocol.FLAG_NONE;

  if (this.endHeaders) {
    flags |= protocol.FLAG_END_HEADERS;
  }

  return flags;
};

ContinuationFrame.prototype._encodePayload = function () {
  return this.headerBlockFragment;
};

ContinuationFrame.prototype.setHeaderBlockFragment = function (headerBlock) {
  if (this.headerBlockFragment !== null) {
    this.length -= this.headerBlockFragment.length;
  }

  this.headerBlockFragment = headerBlock;
  this.length += headerBlock.length;
};


// ==============================================
// Export functions
// ==============================================
exports.decodeFrame = function (buffer) {
  var decoder;

  var header = Frame._decodeHeader(buffer);
  buffer = buffer.slice(protocol.FRAME_HEADER_LEN);

  switch (header.type) {
    case protocol.FRAME_TYPE_DATA:
      decoder = DataFrame;
      break;
    case protocol.FRAME_TYPE_HEADERS:
      decoder = HeadersFrame;
      break;
    case protocol.FRAME_TYPE_PRIORITY:
      decoder = PriorityFrame;
      break;
    case protocol.FRAME_TYPE_RST_STREAM:
      decoder = RstStreamFrame;
      break;
    case protocol.FRAME_TYPE_SETTINGS:
      decoder = SettingsFrame;
      break;
    case protocol.FRAME_TYPE_PUSH_PROMISE:
      decoder = PushPromiseFrame;
      break;
    case protocol.FRAME_TYPE_PING:
      decoder = PingFrame;
      break;
    case protocol.FRAME_TYPE_GOAWAY:
      decoder = GoawayFrame;
      break;
    case protocol.FRAME_TYPE_WINDOW_UPDATE:
      decoder = WindowUpdateFrame;
      break;
    case protocol.FRAME_TYPE_CONTINUATION:
      decoder = ContinuationFrame;
      break;
    default:
      throw new Error('Unknown frame type');
  }

  return decoder.decode(header, buffer);
};

exports.createDataFrame = function () {
  return new DataFrame();
};

exports.createHeadersFrame = function () {
  return new HeadersFrame();
};

exports.createPriorityFrame = function () {
  return new PriorityFrame();
};

exports.createRstStreamFrame = function () {
  return new RstStreamFrame();
};

exports.createSettingsFrame = function () {
  return new SettingsFrame();
};

exports.createPushPromiseFrame = function () {
  return new PushPromiseFrame();
};

exports.createPingFrame = function () {
  return new PingFrame();
};

exports.createGoawayFrame = function () {
  return new GoawayFrame();
};

exports.createWindowUpdateFrame = function () {
  return new WindowUpdateFrame();
};

exports.createContinuationFrame = function () {
  return new ContinuationFrame();
};
