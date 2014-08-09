var events = require('events'),
    util = require('util');

var framer = require('./framer'),
    protocol = require('./protocol');

function FlowController(windowSize) {
  if (!windowSize) {
    windowSize = protocol.INITIAL_WINDOW_SIZE;
  }

  this.initialWindowSize = windowSize;
  this.currentWindowSize = windowSize;

  this._queue = [];
}

util.inherits(FlowController, events.EventEmitter);

FlowController.prototype.updateInitialWindowSize = function(windowSize) {
  var delta = windowSize - this.initialWindowSize;

  if (delta === 0) {
    return;
  }

  this.initialWindowSize = windowSize;
  this.currentWindowSize += delta;

  this._flush();
};

FlowController.prototype.increaseWindowSize = function(increment) {
  this.currentWindowSize += increment;
  this._flush();
};

FlowController.prototype.push = function(frame) {
  if (frame.type === protocol.FRAME_TYPE_DATA) {
    this._queue.push(frame);
    this._flush();
  } else {
    this._send(frame);
  }
};

FlowController.prototype._flush = function() {
  if (this.currentWindowSize === 0) {
    return;
  }

  while (this.currentWindowSize > 0) {
    var frame = this._queue.shift();
    if (frame === undefined) {
      return;
    }

    var chunkLength = protocol.FRAME_LEN_MAX;
    if (chunkLength > this.currentWindowSize) {
      chunkLength = this.currentWindowSize;
    }

    if (frame.length <= chunkLength) {
      this.currentWindowSize -= frame.length;
      this._send(frame);
      continue;
    }

    var chunkedFrame = framer.createDataFrame();
    chunkedFrame.streamId = frame.streamId;
    if (frame.padding !== null) {
      chunkedFrame.setPadding(frame.padding);
    }

    if (chunkedFrame.length >= this.currentWindowSize) {
      this._queue.unshift(frame);
      return;
    }

    var chunkedDataLength = chunkLength - chunkedFrame.length;
    var chunkedData = new Buffer(chunkedDataLength);
    frame.data.copy(chunkedData, 0, 0, chunkedDataLength);
    chunkedFrame.setData(chunkedData);
    frame.setData(frame.data.slice(chunkedDataLength));

    this.currentWindowSize -= chunkedFrame.length;
    this._send(chunkedFrame);

    this._queue.unshift(frame);
  }
};

FlowController.prototype._send = function() {
  throw new Error('Not implemented');
};

module.exports = FlowController;
