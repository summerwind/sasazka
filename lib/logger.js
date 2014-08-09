var util = require('util');
var protocol = require('./protocol');

var LOG_INDENT = (function () {
  var indent = '';
  while (indent.length < 10) {
    indent += ' ';
  }
  return indent;
})();

var colors = {
  green: function (text) {
    return '\u001b[32m' + text + '\u001b[39m';
  },
  yellow: function (text) {
    return '\u001b[33m' + text + '\u001b[39m';
  },
  cyan: function (text) {
    return '\u001b[36m' + text + '\u001b[39m';
  },
  brightRed: function (text) {
    return '\u001b[91m' + text + '\u001b[39m';
  },
  brightBlue: function (text) {
    return '\u001b[94m' + text + '\u001b[39m';
  }
};

var loggers = {};
var start = process.hrtime();


function Logger(component) {
  if (!this._enable(component)) {
    var dummy = function(){};

    this.logFrame = dummy;
    this.log = dummy;
  }
}

Logger.prototype.logFrame = function (frame, sender) {
  var messages = [];

  var length = frame.length;
  var flags = frame._encodeFlags();
  var streamId = frame.streamId;

  var label = sender ? 'Send' : 'Recv';
  var frameTypeName = this._getFrameTypeName(frame.type);
  if (sender) {
    frameTypeName = colors.cyan(frameTypeName);
  } else {
    frameTypeName = colors.brightRed(frameTypeName);
  }

  var head = [];
  head.push(util.format('%s %s frame ', label, frameTypeName));
  head.push(util.format('<length=%d, flags=0x%s, streamId=%d>', length, flags.toString(16), streamId));
  messages.push(head.join(''));

  var flagNames = this._getFlagNames(frame.type, flags);
  if (flagNames !== '') {
    messages.push(util.format('Flags: %s', flagNames));
  }

  if ('padding' in frame && frame.padding !== null) {
    messages.push(util.format('Padding: %d', frame.padding));
  }

  var payload = [];
  switch (frame.type) {
    case protocol.FRAME_TYPE_SETTINGS:
      payload = this._getSettingsPayload(frame);
      break;
    case protocol.FRAME_TYPE_GOAWAY:
      payload = this._getGoawayPayload(frame);
      break;
    case protocol.FRAME_TYPE_WINDOW_UPDATE:
      payload = this._getWindowUpdatePayload(frame);
      break;
  }
  if (payload.length > 0) {
    messages = messages.concat(payload);
  }

  this.log(messages);
};

Logger.prototype.log = function (messages) {
  if (typeof messages === 'string') {
    messages = [messages];
  }

  var time = process.hrtime(start);
  var elapsedTime = colors.green(this._formatTime(time));
  var header = util.format('[%s] ', elapsedTime);

  var logs = [];
  logs.push(header + messages[0]);
  for (var idx = 1, len = messages.length; idx < len; idx++) {
    logs.push(LOG_INDENT + messages[idx]);
  }

  console.log(logs.join('\n'));
};

Logger.prototype._enable = function (component) {
  var result = false;
  var target = process.env.DEBUG;

  if (target && (target.indexOf(component) !== -1 || target === '*')) {
    result = true;
  }

  return result;
};

Logger.prototype._formatTime = function (time) {
  var time1 = time[0].toString();
  while (time1.length < 3) {
    time1 = ' ' + time1;
  }

  var time2 = Math.round(parseInt(time[1], 10) / 1000000).toString();
  while (time2.length < 3) {
    time2 = '0' + time2;
  }

  return time1 + '.' +  time2;
};

Logger.prototype._getFrameTypeName = function (type) {
  var name = 'UNKNOWN';

  switch (type) {
    case protocol.FRAME_TYPE_DATA:
      name = 'DATA';
      break;
    case protocol.FRAME_TYPE_HEADERS:
      name = 'HEADERS';
      break;
    case protocol.FRAME_TYPE_PRIORITY:
      name = 'PRIORITY';
      break;
    case protocol.FRAME_TYPE_RST_STREAM:
      name = 'RST_STREAM';
      break;
    case protocol.FRAME_TYPE_SETTINGS:
      name = 'SETTINGS';
      break;
    case protocol.FRAME_TYPE_PUSH_PROMISE:
      name = 'PUSH_PROMISE';
      break;
    case protocol.FRAME_TYPE_PING:
      name = 'PING';
      break;
    case protocol.FRAME_TYPE_GOAWAY:
      name = 'GOAWAY';
      break;
    case protocol.FRAME_TYPE_WINDOW_UPDATE:
      name = 'WINDOW_UPDATE';
      break;
    case protocol.FRAME_TYPE_CONTINUATION:
      name = 'CONTINUATION';
      break;
  }

  return name;
};

Logger.prototype._getFlagNames = function (type, flags) {
  var names = [];
  var candidates = {};

  switch (type) {
    case protocol.FRAME_TYPE_DATA:
      candidates = {
        'END_STREAM': protocol.FLAG_END_STREAM,
        'PADDED': protocol.FLAG_PADDED
      };
      break;
    case protocol.FRAME_TYPE_HEADERS:
      candidates = {
        'END_STREAM': protocol.FLAG_END_STREAM,
        'END_HEADERS': protocol.FLAG_END_HEADERS,
        'PADDED': protocol.FLAG_PADDED,
        'PRIORITY': protocol.FLAG_PRIORITY
      };
      break;
    case protocol.FRAME_TYPE_SETTINGS:
      candidates = {
        'ACK': protocol.FLAG_ACK
      };
      break;
    case protocol.FRAME_TYPE_PUSH_PROMISE:
      candidates = {
        'END_HEADERS': protocol.FLAG_END_HEADERS,
        'PADDED': protocol.FLAG_PADDED
      };
      break;
    case protocol.FRAME_TYPE_PING:
      candidates = {
        'ACK': protocol.FLAG_ACK
      };
      break;
    case protocol.FRAME_TYPE_CONTINUATION:
      candidates = {
        'END_HEADERS': protocol.FLAG_END_HEADERS
      };
      break;
  }

  for (var name in candidates) {
    if (flags & candidates[name]) {
      names.push(name);
    }
  }

  return names.join(' | ');
};

Logger.prototype._getSettingsPayload = function (frame) {
  var messages = [ 'Settings:' ];

  if (frame.ack) {
    return '';
  }

  for (var param in frame._changed) {
    var name = 'UNKNOWN';
    var value = frame[param];

    switch (param) {
      case 'headerTableSize':
        name = 'SETTINGS_HEADER_TABLE_SIZE(0x1)';
        break;
      case 'enablePush':
        name = 'SETTINGS_ENABLE_PUSH(0x2)';
        value = (value === true) ? 1 : 0;
        break;
      case 'maxConcurrentStreams':
        name = 'SETTINGS_MAX_CONCURRENT_STREAMS(0x3)';
        break;
      case 'initialWindowSize':
        name = 'SETTINGS_INITIAL_WINDOW_SIZE(0x4)';
        break;
      case 'maxFrameSize':
        name = 'SETTINGS_MAX_FRAME_SIZE(0x5)';
        break;
      case 'maxHeaderListSize':
        name = 'SETTINGS_MAX_HEADER_LIST_SIZE(0x6)';
        break;
    }

    messages.push(util.format(' - %s: %s', name, value));
  }

  return messages;
};

Logger.prototype._getGoawayPayload = function (frame) {
  var messages = [];

  messages.push(util.format('Last Stream ID: %d', frame.lastStreamId));
  messages.push(util.format('Error Code: %s', frame.errorCode));
  if (frame.debugData) {
    messages.push(util.format('Debug Data: %s', frame.debugData));
  }

  return messages;
};

Logger.prototype._getWindowUpdatePayload = function (frame) {
  return [ util.format('Increment: %d', frame.windowSizeIncrement) ];
};

module.exports = function (component) {
  if (!loggers[component]) {
    loggers[component] = new Logger(component);
  }

  return loggers[component];
};
