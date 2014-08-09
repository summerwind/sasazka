var stream = require('stream'),
    util = require('util');

var framer = require('./framer'),
    protocol = require('./protocol');

var logger = require('./logger')('deserializer');


function Deserializer (options) {
  options = options || {};
  options.objectMode = true;
  stream.Transform.call(this, options);

  this._frameLength = null;
}

util.inherits(Deserializer, stream.Transform);

Deserializer.prototype._transform = function (chunk, encoding, callback) {
  var length = chunk.length;
  var offset = 0;

  while (offset < length) {
    if (this._frameLength === null) {
      this._frameLength = chunk.readUInt32BE(offset) >> 8;
      this._frameLength += protocol.FRAME_HEADER_LEN;
    }

    var end = offset + this._frameLength;
    if (end <= length) {
      var buffer = chunk.slice(offset, end);
      var frame = framer.decodeFrame(buffer);

      logger.logFrame(frame);
      this.push(frame);

      offset = end;
      this._frameLength = null;
    } else {
      break;
    }
  }

  if (offset < length) {
    this.unshift(chunk.slice(offset));
  }

  callback();
};

module.exports = Deserializer;
