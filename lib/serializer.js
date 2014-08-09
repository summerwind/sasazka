var stream = require('stream'),
    util = require('util');

var logger = require('./logger')('serializer');

function Serializer (options) {
  options = options || {};
  options.objectMode = true;
  stream.Transform.call(this, options);
}

util.inherits(Serializer, stream.Transform);

Serializer.prototype._transform = function (frame, encoding, callback) {
  logger.logFrame(frame, true);

  var buffer = frame.encode(frame);
  this.push(buffer);

  callback();
};

module.exports = Serializer;
