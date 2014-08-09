var util = require('util');

var FlowController = require('./flow_controller'),
    framer = require('./framer'),
    protocol = require('./protocol');

var STREAM_CLOSING_TIMEOUT = 1 * 1000; // 1s


function Stream(options) {
  FlowController.call(this, options.initialWindowSize);

  this.id = options.id;

  this.halfClosed = false;
  this.closed = false;

  this._continue = false;
  this._headerBlockFragments = [];

  this._compressor = options.compressor;
  this._decompressor = options.decompressor;

  this.state = protocol.STATE_IDLE;
  if (options.promised === true) {
    this._setState(protocol.STATE_RESERVED_LOCAL);
  }
}

util.inherits(Stream, FlowController);

Stream.prototype.setPrioroty = function(streamDependency, weight, exclusive) {
  this.sendPriorityFrame(streamDependency, weight, exclusive);
};

Stream.prototype.cancel = function() {
  this.sendRstStreamFrame(protocol.CODE_CANCEL);
};

Stream.prototype.sendDataFrame = function(data, options) {
  if (!options) {
    options = {};
  }

  var frame = framer.createDataFrame();
  frame.streamId = this.id;
  frame.endStream = (options.endStream === true);
  frame.endSegment = (options.endSegment === true);
  frame.setData(data);

  if (options.hasOwnProperty('padding')) {
    frame.setPadding(options.padding);
  }

  this.push(frame);
};

Stream.prototype.sendHeadersFrame = function(headers, options) {
  if (!options) {
    options = {};
  }

  var frame = framer.createHeadersFrame();
  frame.streamId = this.id;
  frame.endStream = (options.endStream === true);
  frame.endHeaders = (options.endHeaders === true);
  frame.setHeaders(headers);

  var headerBlocks = this._compressor.compress(headers);
  frame.setHeaderBlockFragment(headerBlocks);

  if (options.hasOwnProperty('padding')) {
    frame.setPadding(options.padding);
  }

  var frames = this._splitHeadersFrame(frame);
  for (var fi = 0, flen = frames.length; fi < flen; fi++) {
    this.push(frames[fi]);
  }
};

Stream.prototype.sendPriorityFrame = function(streamDependency, weight, exclusive) {
  var frame = framer.createPriorityFrame();
  frame.streamId = this.id;

  if (streamDependency && weight) {
    frame.setPriority(streamDependency, weight, (exclusive === true));
  }

  this.push(frame);
};

Stream.prototype.sendRstStreamFrame = function(errorCode) {
  if (!errorCode) {
    errorCode = protocol.CODE_NO_ERROR;
  }

  var frame = framer.createRstStreamFrame();
  frame.streamId = this.id;
  frame.setErrorCode(errorCode);

  this.push(frame);
};

Stream.prototype.sendPushPromiseFrame = function(promisedStreamId, headers, options) {
  if (!options) {
    options = {};
  }

  var frame = framer.createPushPromiseFrame();
  frame.streamId = this.id;
  frame.endHeaders = (options.endHeaders === true);
  frame.setPromisedStreamId(promisedStreamId);
  frame.setHeaders(headers);

  var headerBlocks = this._compressor.compress(headers);
  frame.setHeaderBlockFragment(headerBlocks);

  if (options.hasOwnProperty('padding')) {
    frame.setPadding(options.padding);
  }

  var frames = this._splitHeadersFrame(frame);
  for (var fi = 0, flen = frames.length; fi < flen; fi++) {
    this.push(frames[fi]);
  }
};

Stream.prototype._splitHeadersFrame = function(frame) {
  if (frame.length <= protocol.FRAME_LEN_MAX) {
    return [frame];
  }

  var frames = [];
  var count = 0;
  var headerBlock = frame.headerBlockFragment;

  var last = protocol.FRAME_LEN_MAX - (frame.length - headerBlock.length);
  var fragment = headerBlock.slice(0, last);
  headerBlock = headerBlock.slice(last);

  frame.setHeaderBlockFragment(fragment);
  frame.endHeaders = false;
  frames.push(frame);
  count++;

  while (headerBlock.length > 0) {
    var contFrame = framer.createContinuationFrame();

    last = protocol.FRAME_LEN_MAX - contFrame.length;
    if (last > headerBlock.length) {
      last = headerBlock.length;
    }

    fragment = headerBlock.slice(0, last);
    headerBlock = headerBlock.slice(last);

    contFrame.setHeaderBlockFragment(fragment);
    frames.push(contFrame);
    count++;
  }

  frames[count - 1].endHeaders = true;

  return frames;
};

Stream.prototype._send = function(frame) {
  var self = this;

  this._transitions(frame, true);
  self.emit('send', frame);
};

Stream.prototype.process = function(frame) {
  var code = protocol.CODE_NO_ERROR;

  if (this._continue && frame.type !== protocol.FRAME_TYPE_CONTINUATION) {
    return this._error(protocol.CODE_PROTOCOL_ERROR, true);
  }

  switch (frame.type) {
    case protocol.FRAME_TYPE_DATA:
      code = this._processDataFrame(frame);
      break;
    case protocol.FRAME_TYPE_HEADERS:
      code = this._processHeadersFrame(frame);
      break;
    case protocol.FRAME_TYPE_PRIORITY:
      code = this._processPriorityFrame(frame);
      break;
    case protocol.FRAME_TYPE_RST_STREAM:
      code = this._processRstStreamFrame(frame);
      break;
    case protocol.FRAME_TYPE_PUSH_PROMISE:
      code = this._processPushPromiseFrame(frame);
      break;
    case protocol.FRAME_TYPE_WINDOW_UPDATE:
      code = this._processWindowUpdateFrame(frame);
      break;
    case protocol.FRAME_TYPE_CONTINUATION:
      code = this._processContinuationFrame(frame);
      break;
    default:
      // Ignore unknown frames
      return code;
  }

  if (code !== protocol.CODE_NO_ERROR) {
    return this._error(code);
  }

  this._transitions(frame);
};

Stream.prototype._processDataFrame = function(frame) {
  var self = this;
  setImmediate(function(){
    self.emit('data', frame.data);
  });

  return protocol.CODE_NO_ERROR;
};

Stream.prototype._processHeadersFrame = function(frame) {
  if (!frame.endHeaders) {
    this._continue = true;
    this._headerBlockFragments.push(frame.headerBlockFragment);

    return protocol.CODE_NO_ERROR;
  }

  var headers = this._decompressor.decompress(frame.headerBlockFragment);

  var self = this;
  setImmediate(function(){
    self.emit('header', headers);
  });

  return protocol.CODE_NO_ERROR;
};

Stream.prototype._processPriorityFrame = function(frame) {
  var self = this;
  setImmediate(function(){
    self.emit('priority', frame.streamDependency, frame.weight, frame.exclusive);
  });

  return protocol.CODE_NO_ERROR;
};

Stream.prototype._processRstStreamFrame = function(frame) {
  if (frame.errorCode === protocol.CODE_CANCEL) {
    var self = this;
    process.nextTick(function() {
      self.emit('cancel');
    });

    return protocol.CODE_NO_ERROR;
  }

  return frame.errorCode;
};

Stream.prototype._processPushPromiseFrame = function(frame) {
  return protocol.CODE_NO_ERROR;
};

Stream.prototype._processWindowUpdateFrame = function(frame) {
  this.increaseWindowSize(frame.windowSizeIncrement);
  return protocol.CODE_NO_ERROR;
};

Stream.prototype._processContinuationFrame = function(frame) {
  if (!this._continue) {
    return protocol.CODE_PROTOCOL_ERROR;
  }

  this._headerBlockFragments.push(frame.headerBlockFragment);

  if (frame.endHeaders) {
    var headerBlock = Buffer.concat(this._headerBlockFragments);
    var headers = this._decompressor.decompress(headerBlock);

    this._continue = false;
    this._headerBlockFragments = [];

    var self = this;
    setImmediate(function(){
      self.emit('header', headers);
    });
  }

  return protocol.CODE_NO_ERROR;
};

Stream.prototype._transitions = function(frame, send) {
  var self = this;
  var next = null;

  send = (send === true);

  switch (this.state) {
    case protocol.STATE_IDLE:
      next = this._transitionsFromIdle(frame, send);
      break;
    case protocol.STATE_RESERVED_LOCAL:
      next = this._transitionsFromReservedLocal(frame, send);
      break;
    case protocol.STATE_RESERVED_REMOTE:
      next = this._transitionsFromReservedRemote(frame, send);
      break;
    case protocol.STATE_OPEN:
      next = this._transitionsFromOpen(frame, send);
      break;
    case protocol.STATE_HALF_CLOSED_LOCAL:
      next = this._transitionsFromHalfClosedLocal(frame, send);
      break;
    case protocol.STATE_HALF_CLOSED_REMOTE:
      next = this._transitionsFromHalfClosedRemote(frame, send);
      break;
    case protocol.STATE_CLOSED:
      next = this._transitionsFromClosed(frame, send);
      break;
    default:
      throw new Error('Unknown stream state');
  }

  if (next === null) {
    return;
  }

  if (this.state !== next) {
    this._setState(next);
  }

  if (this.state < protocol.STATE_OPEN && protocol.STATE_OPEN <= next) {
    process.nextTick(function() {
      self.emit('active');
    });
  }

  if (frame.endStream === true) {
    process.nextTick(function() {
      self.emit('end');
    });

    if (this.state === protocol.STATE_OPEN) {
      this._transitions(frame, send);
      return;
    }
  }

  if (this.state === protocol.STATE_CLOSED) {
    this._close();
  }
};

Stream.prototype._transitionsFromIdle = function(frame, send) {
  var next = protocol.STATE_IDLE;

  switch (frame.type) {
    case protocol.FRAME_TYPE_HEADERS:
      next = protocol.STATE_OPEN;
      break;
    case protocol.FRAME_TYPE_PUSH_PROMISE:
      if (send) {
        throw new Error('Implemntation error');
      } else {
        next = protocol.STATE_RESERVED_REMOTE;
      }
      break;
    default:
      if (send) {
        throw new Error('Implemntation error');
      } else {
        this._error(protocol.CODE_PROTOCOL_ERROR, true);
        next = null;
      }
  }

  return next;
};

Stream.prototype._transitionsFromReservedLocal = function(frame, send) {
  var next = protocol.STATE_RESERVED_LOCAL;

  if (send) {
    switch (frame.type) {
      case protocol.FRAME_TYPE_HEADERS:
        next = protocol.STATE_HALF_CLOSED_REMOTE;
        break;
      case protocol.FRAME_TYPE_RST_STREAM:
        next = protocol.STATE_CLOSED;
        break;
      default:
        throw new Error('Implementation error');
    }
  } else {
    switch (frame.type) {
      case protocol.FRAME_TYPE_PRIORITY:
        // Nothing to do.
        break;
      case protocol.FRAME_TYPE_RST_STREAM:
        next = protocol.STATE_CLOSED;
        break;
      default:
        this._error(protocol.CODE_PROTOCOL_ERROR, true);
        next = null;
    }
  }

  return next;
};

Stream.prototype._transitionsFromReservedRemote = function(frame, send) {
  var next = protocol.STATE_RESERVED_REMOTE;

  if (send) {
    switch (frame.type) {
      case protocol.FRAME_TYPE_PRIORITY:
        // Nothing to do.
        break;
      case protocol.FRAME_TYPE_RST_STREAM:
        next = protocol.STATE_CLOSED;
        break;
      default:
        throw new Error('Implementation error');
    }
  } else {
    switch (frame.type) {
      case protocol.FRAME_TYPE_HEADERS:
        next = protocol.STATE_HALF_CLOSED_LOCAL;
        break;
      case protocol.FRAME_TYPE_RST_STREAM:
        next = protocol.STATE_CLOSED;
        break;
      default:
        this._error(protocol.CODE_PROTOCOL_ERROR, true);
        next = null;
    }
  }

  return next;
};

Stream.prototype._transitionsFromOpen = function(frame, send) {
  var next = protocol.STATE_OPEN;

  switch (frame.type) {
    case protocol.FRAME_TYPE_DATA:
    case protocol.FRAME_TYPE_HEADERS:
      if (frame.endStream) {
        next = send ? protocol.STATE_HALF_CLOSED_LOCAL : protocol.STATE_HALF_CLOSED_REMOTE;
      }
      break;
    case protocol.FRAME_TYPE_RST_STREAM:
      next = protocol.STATE_CLOSED;
      break;
  }

  return next;
};

Stream.prototype._transitionsFromHalfClosedLocal = function(frame, send) {
  var next = protocol.STATE_HALF_CLOSED_LOCAL;

  if (send) {
    switch (frame.type) {
      case protocol.FRAME_TYPE_RST_STREAM:
        next = protocol.STATE_CLOSED;
        break;
      case protocol.FRAME_TYPE_CONTINUATION:
        // Nothing to do.
        break;
      default:
        throw new Error('Implementation error');
    }
  } else {
    switch (frame.type) {
      case protocol.FRAME_TYPE_DATA:
      case protocol.FRAME_TYPE_HEADERS:
        if (frame.endStream) {
          next = protocol.STATE_CLOSED;
        }
        break;
      case protocol.FRAME_TYPE_RST_STREAM:
        next = protocol.STATE_CLOSED;
        break;
    }
  }

  return next;
};

Stream.prototype._transitionsFromHalfClosedRemote = function(frame, send) {
  var next = protocol.STATE_HALF_CLOSED_REMOTE;

  if (send) {
    switch (frame.type) {
      case protocol.FRAME_TYPE_DATA:
      case protocol.FRAME_TYPE_HEADERS:
        if (frame.endStream) {
          next = protocol.STATE_CLOSED;
        }
        break;
      case protocol.FRAME_TYPE_RST_STREAM:
        next = protocol.STATE_CLOSED;
        break;
    }
  } else {
    switch (frame.type) {
      case protocol.FRAME_TYPE_RST_STREAM:
        next = protocol.STATE_CLOSED;
        break;
      case protocol.FRAME_TYPE_WINDOW_UPDATE:
      case protocol.FRAME_TYPE_CONTINUATION:
        // Nothing to do.
        break;
      default:
        var code = protocol.CODE_STREAM_CLOSED;
        this.sendRstStreamFrame(code);
        this._error(code);
        next = null;
    }
  }

  return next;
};

Stream.prototype._transitionsFromClosed = function(frame, send) {
  var next = protocol.STATE_CLOSED;

  if (send) {
    switch (frame.type) {
      case protocol.FRAME_TYPE_RST_STREAM:
      case protocol.FRAME_TYPE_PRIORITY:
        // Nothing to do.
        break;
      default:
        throw new Error('Implementation error');
    }
  } else {
    if (this.closed && frame.type !== protocol.FRAME_TYPE_PRIORITY) {
      var code = protocol.CODE_STREAM_CLOSED;
      this.sendRstStreamFrame(code);
      this._error(code);
      next = null;
    }
  }

  return next;
};

Stream.prototype._setState = function(state) {
  this.state = state;
  this.emit('state', state);
};

Stream.prototype._close = function(hadError) {
  var self = this;

  setTimeout(function() {
    self.closed = true;
  }, STREAM_CLOSING_TIMEOUT);

  this.emit('close', hadError);
};

Stream.prototype._error = function(errorCode, connectionError) {
  var self = this;

  this._setState(protocol.STATE_CLOSED);

  self.emit('error', errorCode, connectionError);

  process.nextTick(function() {
    self._close(true);
  });
};


module.exports = Stream;
