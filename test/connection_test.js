var events = require('events'),
    net = require('net');

var expect = require('expect.js');

var Connection = require('../lib/connection'),
    framer = require('../lib/framer'),
    protocol = require('../lib/protocol');

var SERVER_PORT = 8888;

describe('Connection', function () {
  var server;

  before(function (done) {
    server = net.createServer();
    server.listen(SERVER_PORT, function () {
      done();
    });
  });

  after(function () {
    server.close();
  });

  var createConnection = function (server) {
    var socket = net.createConnection(SERVER_PORT);
    var conn = new Connection(socket, {}, (server === true));
    conn._setupPipeline();

    return conn;
  };

  describe('createStream()', function () {
    it('returns stream object', function () {
      var conn = createConnection(true);
      var stream = conn.createStream();
      expect(stream.id).to.be(2);
    });

    it('emits stream event', function (done) {
      var stream = null;

      var conn = createConnection(true);
      conn.on('stream', function (newStream) {
        expect(newStream).to.eql(stream);
        done();
      });

      stream = conn.createStream();
    });

    context('stream ID already used', function () {
      it('emits stream refused error', function (done) {
        var conn = createConnection(true);
        conn.on('error', function (err) {
          expect(err.code).to.eql(protocol.CODE_PROTOCOL_ERROR);
          done();
        });

        var stream = conn.createStream();
        conn.createStream(stream.id);
      });
    });

    describe('Promised Stream', function () {
      it('returns promised stream', function () {
        var conn = createConnection(true);
        stream = conn.createStream(true);
        expect(stream.state).to.be(protocol.STATE_RESERVED_LOCAL);
      });

      context('enable push settings is disabled', function () {
        it('returns null', function () {
          var conn = createConnection(true);
          conn._remoteSettings.enablePush = false;

          var stream = conn.createStream(true);
          expect(stream).to.be(null);
        });
      });
    });
  });

  describe('ping()', function () {
    it('sends PING', function (done) {
      var conn = createConnection(true);

      conn._serializer.write = function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_PING);
        expect(frame.ack).to.be(false);
        done();
      };

      conn.ping();
    });
  });

  describe('destroy()', function () {
    it('sends GOAWAY', function (done) {
      var conn = createConnection(true);

      conn._serializer.write = function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_GOAWAY);
        expect(frame.errorCode).to.be(protocol.CODE_NO_ERROR);
        done();
      };

      conn.destroy();
    });
  });

  describe('sendSettingsFrame()', function () {
    it('sends SETTINGS', function (done) {
      var conn = createConnection(true);

      var settings = {
        headerTableSize: 2048,
        initialWindowSize: 100,
        invalidSettingName: true
      };

      conn._serializer.write = function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_SETTINGS);
        expect(frame.headerTableSize).to.be(settings.headerTableSize);
        expect(frame.initialWindowSize).to.be(settings.initialWindowSize);
        expect(conn._pendingSettings[0]).to.be(settings);
        done();
      };

      conn.sendSettingsFrame(settings);
    });

    it('sends SETTINGS with ACK', function (done) {
      var conn = createConnection(true);

      conn._serializer.write = function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_SETTINGS);
        expect(frame.ack).to.be(true);
        done();
      };

      conn.sendSettingsFrame(true);
    });
  });

  describe('sendGoawayFrame()', function () {
    it('sends GOAWAY', function (done) {
      var conn = createConnection(true);

      conn._serializer.write = function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_GOAWAY);
        expect(frame.errorCode).to.be(protocol.CODE_NO_ERROR);
        done();
      };

      conn.sendGoawayFrame();
    });

    it('sends GOAWAY with error code', function (done) {
      var conn = createConnection(true);

      var errorCode = protocol.CODE_PROTOCOL_ERROR;

      conn._serializer.write = function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_GOAWAY);
        expect(frame.errorCode).to.be(errorCode);
        done();
      };

      conn.sendGoawayFrame(errorCode);
    });
  });

  describe('sendPingFrame()', function () {
    it('sends PING', function (done) {
      var conn = createConnection(true);

      conn._serializer.write = function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_PING);
        done();
      };

      conn.sendPingFrame();
    });

    it('sends PING with opaque data', function (done) {
      var conn = createConnection(true);

      var opaqueData = 'test';
      var encodedOpaqueData = new Buffer([
        0x74, 0x65, 0x73, 0x74, 0x00, 0x00, 0x00, 0x00
      ]);

      conn._serializer.write = function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_PING);
        expect(frame.opaqueData).to.eql(encodedOpaqueData);
        done();
      };

      conn.sendPingFrame(opaqueData);
    });
  });

  describe('Frame Processing', function () {
    context('receiving DATA', function () {
      it('emits error event', function (done) {
        var conn = createConnection(true);

        var frame = framer.createDataFrame();
        frame.streamId = 0;

        conn.once('error', function (err) {
          expect(err.code).to.be(protocol.CODE_PROTOCOL_ERROR);
          done();
        });

        conn._deserializer.emit('data', frame);
      });
    });

    context('receiving HEADERS', function () {
      it('emits error event', function (done) {
        var conn = createConnection(true);

        var frame = framer.createHeadersFrame();
        frame.streamId = 0;

        conn.once('error', function (err) {
          expect(err.code).to.be(protocol.CODE_PROTOCOL_ERROR);
          done();
        });

        conn._deserializer.emit('data', frame);
      });
    });

    context('receiving RST_STREAM', function () {
      it('emits error event', function (done) {
        var conn = createConnection(true);

        var frame = framer.createRstStreamFrame();
        frame.streamId = 0;

        conn.once('error', function (err) {
          expect(err.code).to.be(protocol.CODE_PROTOCOL_ERROR);
          done();
        });

        conn._deserializer.emit('data', frame);
      });
    });

    context('receiving PUSH_PROMISE', function () {
      it('emits error event', function (done) {
        var conn = createConnection(true);

        var frame = framer.createPushPromiseFrame();
        frame.streamId = 0;

        conn.once('error', function (err) {
          expect(err.code).to.be(protocol.CODE_PROTOCOL_ERROR);
          done();
        });

        conn._deserializer.emit('data', frame);
      });
    });

    context('receiving CONTINUATION', function () {
      it('emits error event', function (done) {
        var conn = createConnection(true);

        var frame = framer.createContinuationFrame();
        frame.streamId = 0;

        conn.once('error', function (err) {
          expect(err.code).to.be(protocol.CODE_PROTOCOL_ERROR);
          done();
        });

        conn._deserializer.emit('data', frame);
      });
    });

    context('receiving PRIORITY', function () {
      it('emits error event', function (done) {
        var conn = createConnection(true);

        var frame = framer.createPriorityFrame();
        frame.streamId = 0;

        conn.once('error', function (err) {
          expect(err.code).to.be(protocol.CODE_PROTOCOL_ERROR);
          done();
        });

        conn._deserializer.emit('data', frame);
      });
    });

    context('receiving GOAWAY', function () {
      it('emits error event', function (done) {
        var conn = createConnection(true);

        var frame = framer.createGoawayFrame();
        frame.lastStreamId = 3;
        frame.errorCode = protocol.CODE_PROTOCOL_ERROR;

        conn.once('error', function (err) {
          expect(err.code).to.be(protocol.CODE_PROTOCOL_ERROR);
          done();
        });

        conn._deserializer.emit('data', frame);
      });
    });

    context('receiving SETTINGS', function () {
      it('sends SETTINGS frame with ACK flag', function (done) {
        var conn = createConnection(true);

        var frame = framer.createSettingsFrame();
        frame.setEnablePush(false);
        frame.setMaxConcurrentStreams(100);

        conn._serializer.write = function (frame) {
          expect(frame.type).to.be(protocol.FRAME_TYPE_SETTINGS);
          expect(frame.ack).to.be(true);
          done();
        };

        conn._deserializer.emit('data', frame);
      });

      it('applies new settings', function () {
        var conn = createConnection(true);

        var settings = {
          enablePush: false,
          maxConcurrentStreams: 100
        };

        var frame = framer.createSettingsFrame();
        frame.ack = true;

        conn._pendingSettings.push(settings);
        conn._deserializer.emit('data', frame);
        expect(conn._localSettings.enablePush).to.be(settings.enablePush);
        expect(conn._localSettings.maxConcurrentStreams).to.be(settings.maxConcurrentStreams);
      });
    });

    context('receiving PING', function () {
      it('sends PING with ACK flag', function (done) {
        var conn = createConnection(true);

        var frame = framer.createPingFrame();

        conn._serializer.write = function (frame) {
          expect(frame.type).to.be(protocol.FRAME_TYPE_PING);
          expect(frame.ack).to.be(true);
          done();
        };

        conn._deserializer.emit('data', frame);
      });

      it('emits ping event', function (done) {
        var conn = createConnection(true);

        var frame = framer.createPingFrame();
        frame.ack = true;

        conn.once('ping', function () {
          done();
        });

        conn._deserializer.emit('data', frame);
      });
    });

    context('receiving WINDOW_UPDATE', function () {
      it('updates connection level flow control window', function () {
        var conn = createConnection(true);

        var currentWindowSize = conn.currentWindowSize;
        var increment = 1000;

        var frame = framer.createWindowUpdateFrame();
        frame.setWindowSizeIncrement(increment);

        conn._deserializer.emit('data', frame);
        expect(conn.currentWindowSize).to.be(currentWindowSize + increment);
      });
    });

    context('receiving a frame associated with the stream', function () {
      it('creates the new stream', function (done) {
        var conn = createConnection(true);

        var headerBlock = new Buffer([
          0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
          0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
          0x2e, 0x63, 0x6f, 0x6d
        ]);

        var frame = framer.createHeadersFrame();
        frame.streamId = 3;
        frame.endHeaders = true;
        frame.setHeaderBlockFragment(headerBlock);

        conn.on('stream', function (stream) {
          expect(stream.id).to.be(frame.streamId);
          done();
        });

        conn._deserializer.emit('data', frame);
      });

      it('passes the frame to the stream', function (done) {
        var conn = createConnection(true);

        var headerBlock = new Buffer([
          0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
          0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
          0x2e, 0x63, 0x6f, 0x6d
        ]);

        var data = 'test';

        var headersFrame = framer.createHeadersFrame();
        headersFrame.streamId = 3;
        headersFrame.endHeaders = true;
        headersFrame.setHeaderBlockFragment(headerBlock);

        var dataFrame = framer.createDataFrame();
        dataFrame.streamId = 3;
        dataFrame.endStream = true;
        dataFrame.setData(data);

        conn.on('stream', function (stream) {
          stream.on('data', function (chunk) {
            expect(chunk).to.eql(new Buffer(data));
            done();
          });
        });

        conn._deserializer.emit('data', headersFrame);
        conn._deserializer.emit('data', dataFrame);
      });
    });
  });

  describe('Socket Management', function () {
    context('emitted close event', function () {
      it('emits close event', function (done) {
        var conn = createConnection(true);

        conn.on('close', function () {
          done();
        });

        conn.socket.emit('close');
      });
    });

    context('emitted error event', function () {
      it('emits error event', function (done) {
        var conn = createConnection(true);

        conn.on('error', function () {
          done();
        });

        conn.socket.emit('error', new Error());
      });
    });

    context('emitted timeout event', function () {
      it('emits error event', function (done) {
        var conn = createConnection(true);

        conn.on('timeout', function () {
          done();
        });

        conn.socket.emit('timeout');
      });
    });
  });
});