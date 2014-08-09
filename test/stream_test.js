var events = require('events');

var expect = require('expect.js'),
    waitress = require('waitress');

var Stream = require('../lib/stream'),
    hpack = require('../lib/hpack'),
    framer = require('../lib/framer'),
    protocol = require('../lib/protocol');

describe('Stream', function () {
  var socket = new events.EventEmitter();

  var createStream = function (type) {
    var options = {
      id: (type === 'client') ? 1 : 2,
      initialWindowSize:  protocol.INITIAL_WINDOW_SIZE,
      compressor: hpack.createContext(),
      decompressor: hpack.createContext(),
      promised: false
    };
    return new Stream(options);
  };

  describe('setPrioroty()', function () {
    it('sends PRIORITY', function (done) {
      var stream = createStream('client');
      stream.state = protocol.STATE_OPEN;

      var streamDependency = 3;
      var weight = 1;
      var exclusive = true;

      stream.on('send', function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_PRIORITY);
        expect(frame.streamDependency).to.be(streamDependency);
        expect(frame.weight).to.be(weight);
        expect(frame.exclusive).to.be(exclusive);
        done();
      });

      stream.setPrioroty(streamDependency, weight, exclusive);
    });
  });

  describe('cancel()', function () {
    it('sends RST_STREAM', function (done) {
      var stream = createStream('client');
      stream.state = protocol.STATE_OPEN;

      stream.on('send', function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_RST_STREAM);
        expect(frame.errorCode).to.be(protocol.CODE_CANCEL);
        done();
      });

      stream.cancel();
    });
  });

  describe('sendDataFrame()', function () {
    it('sends DATA', function (done) {
      var stream = createStream('client');
      stream.state = protocol.STATE_OPEN;

      var data = 'test';
      var options = {
        endStream: true,
        endSegment: true,
        padding: 8
      };

      stream.on('send', function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_DATA);
        expect(frame.endStream).to.be(options.endStream);
        expect(frame.endSegment).to.be(options.endSegment);
        expect(frame.padding).to.be(options.padding);
        expect(frame.data).to.eql(new Buffer(data));
        done();
      });

      stream.sendDataFrame('test', options);
    });
  });

  describe('sendDataFrame()', function () {
    it('sends DATA', function (done) {
      var stream = createStream('client');
      stream.state = protocol.STATE_OPEN;

      var data = 'test';
      var options = {
        endStream: true,
        endSegment: true,
        padding: 8
      };

      stream.on('send', function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_DATA);
        expect(frame.endStream).to.be(options.endStream);
        expect(frame.endSegment).to.be(options.endSegment);
        expect(frame.padding).to.be(options.padding);
        expect(frame.data).to.eql(new Buffer(data));
        done();
      });

      stream.sendDataFrame('test', options);
    });
  });

  describe('sendHeadersFrame()', function () {
    it('sends HEADERS', function (done) {
      var stream = createStream('client');
      stream.state = protocol.STATE_OPEN;

      var headers = [
        [ ':status', '200' ],
      ];

      var options = {
        endStream: true,
        endHeaders: true,
        padding: 8
      };

      stream.on('send', function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_HEADERS);
        expect(frame.endStream).to.be(options.endStream);
        expect(frame.endHeaders).to.be(options.endHeaders);
        expect(frame.padding).to.be(options.padding);
        expect(frame.headers).to.eql(headers);
        done();
      });

      stream.sendHeadersFrame(headers, options);
    });

    it('sends HEADERS and CONTINUATION', function (done) {
      var stream = createStream('client');
      stream.state = protocol.STATE_OPEN;

      var value = '';
      for (var i=0; i<20000; i++) {
        value += 'x';
      }

      var headers = [
        [ ':status', '200' ],
        [ 'x-custom1', value ],
        [ 'x-custom2', value ],
      ];

      var options = {
        endStream: true,
        endHeaders: true,
        padding: 8
      };

      var frames = [];
      var check = waitress(3, function() {
        expect(frames[0].type).to.be(protocol.FRAME_TYPE_HEADERS);
        expect(frames[0].length).to.be(protocol.FRAME_LEN_MAX);
        expect(frames[0].endStream).to.be(options.endStream);
        expect(frames[0].endHeaders).to.be(false);
        expect(frames[0].padding).to.be(options.padding);
        expect(frames[0].headers).to.eql(headers);

        expect(frames[1].type).to.be(protocol.FRAME_TYPE_CONTINUATION);
        expect(frames[1].length).to.be(protocol.FRAME_LEN_MAX);
        expect(frames[1].endHeaders).to.be(false);

        expect(frames[2].type).to.be(protocol.FRAME_TYPE_CONTINUATION);
        expect(frames[2].length).to.be(2270);
        expect(frames[2].endHeaders).to.be(true);

        done();
      });

      stream.on('send', function (frame) {
        frames.push(frame);
        check();
      });

      stream.sendHeadersFrame(headers, options);
    });
  });

  describe('sendPriorityFrame()', function () {
    it('sends PRIORITY', function (done) {
      var stream = createStream('client');
      stream.state = protocol.STATE_OPEN;

      var streamDependency = 3;
      var weight = 1;
      var exclusive = true;

      stream.on('send', function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_PRIORITY);
        expect(frame.streamDependency).to.be(streamDependency);
        expect(frame.weight).to.be(weight);
        expect(frame.exclusive).to.be(exclusive);
        done();
      });

      stream.sendPriorityFrame(streamDependency, weight, exclusive);
    });
  });

  describe('sendRstStreamFrame()', function () {
    it('sends RST_STREAM', function (done) {
      var stream = createStream('client');
      stream.state = protocol.STATE_OPEN;

      var errorCode = protocol.CODE_NO_ERROR;

      stream.on('send', function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_RST_STREAM);
        expect(frame.errorCode).to.be(errorCode);
        done();
      });

      stream.sendRstStreamFrame(errorCode);
    });
  });

  describe('sendPushPromiseFrame()', function () {
    it('sends PUSH_PROMISE', function (done) {
      var stream = createStream('client');
      stream.state = protocol.STATE_OPEN;

      var promisedStreamId = 3;
      var headers = [
        [ ':method', 'GET'  ],
        [ ':scheme', 'http' ],
        [ ':path',   '/'    ]
      ];

      var options = {
        endHeaders: true,
        padding: 8
      };

      stream.on('send', function (frame) {
        expect(frame.type).to.be(protocol.FRAME_TYPE_PUSH_PROMISE);
        expect(frame.promisedStreamId).to.be(promisedStreamId);
        expect(frame.endHeaders).to.be(options.endHeaders);
        expect(frame.padding).to.be(options.padding);
        expect(frame.headers).to.eql(headers);
        done();
      });

      stream.sendPushPromiseFrame(promisedStreamId, headers, options);
    });

    it('sends PUSH_PROMISE and CONTINUATION', function (done) {
      var stream = createStream('client');
      stream.state = protocol.STATE_OPEN;

      var value = '';
      for (var i=0; i<20000; i++) {
        value += 'x';
      }

      var promisedStreamId = 3;
      var headers = [
        [ ':status', '200' ],
        [ 'x-custom1', value ],
        [ 'x-custom2', value ],
      ];

      var options = {
        endHeaders: true,
        padding: 8
      };

      var frames = [];
      var check = waitress(3, function() {
        expect(frames[0].type).to.be(protocol.FRAME_TYPE_PUSH_PROMISE);
        expect(frames[0].length).to.be(protocol.FRAME_LEN_MAX);
        expect(frames[0].promisedStreamId).to.be(promisedStreamId);
        expect(frames[0].endHeaders).to.be(false);
        expect(frames[0].padding).to.be(options.padding);
        expect(frames[0].headers).to.eql(headers);

        expect(frames[1].type).to.be(protocol.FRAME_TYPE_CONTINUATION);
        expect(frames[1].length).to.be(protocol.FRAME_LEN_MAX);
        expect(frames[1].endHeaders).to.be(false);

        expect(frames[2].type).to.be(protocol.FRAME_TYPE_CONTINUATION);
        expect(frames[2].length).to.be(2274);
        expect(frames[2].endHeaders).to.be(true);

        done();
      });

      stream.on('send', function (frame) {
        frames.push(frame);
        check();
      });

      stream.sendPushPromiseFrame(promisedStreamId, headers, options);
    });
  });

  describe('process()', function () {
    context('receiving DATA', function () {
      it('emits data event', function (done) {
        var stream = createStream('client');
        stream.state = protocol.STATE_OPEN;

        var data = 'test';

        var frame = framer.createDataFrame();
        frame.streamId = stream.id;
        frame.endStream = true;
        frame.endSegment = true;
        frame.setData(data);

        stream.on('data', function (frameData) {
          expect(frameData).to.eql(new Buffer(data));
          done();
        });

        stream.process(frame);
      });
    });

    context('receiving HEADERS', function () {
      it('emits header event', function (done) {
        var stream = createStream('client');
        stream.state = protocol.STATE_OPEN;

        var headers = [
          [ ':status', '200' ],
        ];
        var headerBlock = new Buffer([ 0x88 ]);

        var frame = framer.createHeadersFrame();
        frame.streamId = stream.id;
        frame.endStream = true;
        frame.endHeaders = true;
        frame.setHeaders(headers);
        frame.setHeaderBlockFragment(headerBlock);

        stream.on('header', function (frameHeaders) {
          expect(headers).to.eql(frameHeaders);
          done();
        });

        stream.process(frame);
      });
    });

    context('receiving PRIORITY', function () {
      it('emits priority event', function (done) {
        var stream = createStream('client');
        stream.state = protocol.STATE_OPEN;

        var streamDependency = 3;
        var weight = 1;
        var exclusive = true;

        var frame = framer.createPriorityFrame();
        frame.streamId = stream.id;
        frame.setPriority(streamDependency, weight, exclusive);

        stream.on('priority', function (d, w, e) {
          expect(d).to.eql(streamDependency);
          expect(w).to.eql(weight);
          expect(e).to.eql(exclusive);
          done();
        });

        stream.process(frame);
      });
    });

    context('receiving RST_STREAM', function () {
      it('emits cancel event', function (done) {
        var stream = createStream('client');
        stream.state = protocol.STATE_OPEN;

        var frame = framer.createRstStreamFrame();
        frame.streamId = stream.id;
        frame.setErrorCode(protocol.CODE_CANCEL);

        stream.on('cancel', function () {
          done();
        });

        stream.process(frame);
      });

      it('emits error event', function (done) {
        var stream = createStream('client');
        stream.state = protocol.STATE_OPEN;

        var frame = framer.createRstStreamFrame();
        frame.streamId = stream.id;
        frame.setErrorCode(protocol.CODE_STREAM_CLOSED);

        stream.on('error', function (errorCode) {
          expect(errorCode).to.eql(protocol.CODE_STREAM_CLOSED);
          done();
        });

        stream.process(frame);
      });
    });

    context('receiving CONTINUATION', function () {
      it('emits header event', function (done) {
        var stream = createStream('client');
        stream.state = protocol.STATE_OPEN;

        var value = '';
        for (var i=0; i<20000; i++) {
          value += 'x';
        }

        var headers = [
          [ ':status', '200' ],
          [ 'x-custom1', value ],
          [ 'x-custom2', value ],
        ];
        var headerBlock = stream._compressor.compress(headers);

        var frame = framer.createHeadersFrame();
        frame.streamId = stream.id;
        frame.endStream = true;
        frame.endHeaders = true;
        frame.setHeaderBlockFragment(headerBlock);

        stream.on('header', function (frameHeaders) {
          expect(frameHeaders).to.eql(headers);
          done();
        });

        var frames = stream._splitHeadersFrame(frame);
        for (var fi=0, flen=frames.length; fi<flen; fi++) {
          stream.process(frames[fi]);
        }
      });

      it('emits error event', function (done) {
        var stream = createStream('client');
        stream.state = protocol.STATE_OPEN;

        var value = '';
        for (var i=0; i<20000; i++) {
          value += 'x';
        }

        var headers = [
          [ ':status', '200' ],
          [ 'x-custom1', value ],
          [ 'x-custom2', value ],
        ];
        var headerBlock = stream._compressor.compress(headers);

        var frame = framer.createHeadersFrame();
        frame.streamId = stream.id;
        frame.endStream = true;
        frame.endHeaders = true;
        frame.setHeaderBlockFragment(headerBlock);

        stream.on('error', function (errorCode) {
          expect(errorCode).to.eql(protocol.CODE_PROTOCOL_ERROR);
          done();
        });

        var frames = stream._splitHeadersFrame(frame);
        stream.process(frames[1]);
      });
    });

    context('receiving WINDOW_UPDATE', function () {
      it('updates flow controll window', function () {
        var stream = createStream('client');
        stream.state = protocol.STATE_OPEN;

        var size = 100;
        var currentSize = stream.currentWindowSize;

        var frame = framer.createWindowUpdateFrame();
        frame.streamId = stream.id;
        frame.setWindowSizeIncrement(size);

        stream.process(frame);
        expect(stream.currentWindowSize).to.eql(currentSize + size);
      });
    });

    describe('State Management', function () {
      describe('idle state', function () {
        context('sending HEADERS', function () {
          it('transitions to open state', function () {
            var stream = createStream('client');
            var headers = [
              [ ':method', 'GET' ],
              [ ':scheme', 'http' ],
              [ ':path', '/' ],
              [ ':authority', 'www.example.com' ]
            ];

            stream.sendHeadersFrame(headers);
            expect(stream.state).to.be(protocol.STATE_OPEN);
          });
        });

        context('receiving HEADERS', function () {
          it('transitions to open state', function () {
            var stream = createStream('server');

            var headerBlock = new Buffer([
              0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
              0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
              0x2e, 0x63, 0x6f, 0x6d
            ]);

            var frame = framer.createHeadersFrame();
            frame.streamId = 1;
            frame.endHeaders = true;
            frame.setHeaderBlockFragment(headerBlock);

            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_OPEN);
          });
        });

        context('sending PUSH_PROMISE', function () {
          it('throws implementation error', function () {
            var stream = createStream('server');
            var headers = [
              [ ':method', 'GET' ],
              [ ':scheme', 'http' ],
              [ ':path', '/' ],
              [ ':authority', 'www.example.com' ]
            ];

            expect(function(){
              stream.sendPushPromiseFrame(3, headers);
            }).to.throwError();
          });
        });

        context('receiving PUSH_PROMISE', function () {
          it('transitions to reserved (remote)', function () {
            var stream = createStream('client');

            var headerBlock = new Buffer([
              0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
              0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
              0x2e, 0x63, 0x6f, 0x6d
            ]);

            var frame = framer.createPushPromiseFrame();
            frame.streamId = 1;
            frame.endHeaders = true;
            frame.setPromisedStreamId(3);
            frame.setHeaderBlockFragment(headerBlock);

            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_RESERVED_REMOTE);
          });
        });

        context('sending frames other than HEADERS or PUSH_PROMISE', function () {
          it('throws implementation error', function () {
            var stream = createStream('client');

            expect(function () {
              stream.sendDataFrame('test');
            }).to.throwError();
          });
        });

        context('receiving frames other than HEADERS or PUSH_PROMISE', function () {
          it('emits PROTOCOL_ERROR connection error', function (done) {
            var stream = createStream('server');

            var frame = framer.createDataFrame();
            frame.streamId = 2;
            frame.setData('test');

            stream.on('error', function (err) {
              expect(err).to.be(protocol.CODE_PROTOCOL_ERROR);
              done();
            });

            stream.process(frame);
          });
        });
      });

      describe('reserved (local) state', function () {
        context('sending HEADERS', function () {
          it('transitions to half closed (remote) state', function () {
            var stream = createStream('server');
            var headers = [
              [ ':status', '200' ],
            ];

            stream.state = protocol.STATE_RESERVED_LOCAL;
            stream.sendHeadersFrame(headers);
            expect(stream.state).to.be(protocol.STATE_HALF_CLOSED_REMOTE);
          });
        });

        context('sending RST_STREAM', function () {
          it('transitions to closed state', function () {
            var stream = createStream('server');

            stream.state = protocol.STATE_RESERVED_LOCAL;
            stream.sendRstStreamFrame(protocol.CODE_NO_ERROR);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('sending frames other than HEADERS or RST_STREAM', function () {
          it('throws implementation error', function () {
            var stream = createStream('server');

            stream.state = protocol.STATE_RESERVED_LOCAL;
            expect(function(){
              stream.sendDataFrame('test');
            }).to.throwError();
          });
        });

        context('receiving RST_STREAM', function () {
          it('transitions to closed state', function () {
            var stream = createStream('server');

            var frame = framer.createRstStreamFrame();
            frame.streamId = 1;
            frame.setErrorCode(protocol.CODE_NO_ERROR);

            stream.state = protocol.STATE_RESERVED_LOCAL;
            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('receiving PRIORITY', function () {
          it('does nothing', function () {
            var stream = createStream('server');

            var frame = framer.createPriorityFrame();
            frame.streamId = 3;
            frame.setPriority(1, 8, false);

            stream.state = protocol.STATE_RESERVED_LOCAL;
            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_RESERVED_LOCAL);
          });
        });

        context('receiving frames other than RST_STREAM or PRIORITY', function () {
          it('emits PROTOCOL_ERROR connection error', function (done) {
            var stream = createStream('server');

            var frame = framer.createDataFrame();
            frame.streamId = 2;
            frame.setData('test');

            stream.on('error', function (err) {
              expect(err).to.be(protocol.CODE_PROTOCOL_ERROR);
              done();
            });

            stream.state = protocol.STATE_RESERVED_LOCAL;
            stream.process(frame);
          });
        });
      });

      describe('reserved (remote) state', function () {
        context('receiving HEADERS', function () {
          it('transitions to half closed (local) state', function () {
            var stream = createStream('client');

            var headerBlock = new Buffer([
              0x82, 0x87, 0x86, 0x04, 0x8b,
              0xdb, 0x6d, 0x88, 0x3e, 0x68,
              0xd1, 0xcb, 0x12, 0x25, 0xba,
              0x7f
            ]);

            var frame = framer.createHeadersFrame();
            frame.streamId = 1;
            frame.endHeaders = true;
            frame.setHeaderBlockFragment(headerBlock);

            stream.state = protocol.STATE_RESERVED_REMOTE;
            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_HALF_CLOSED_LOCAL);
          });
        });

        context('sending RST_STREAM', function () {
          it('transitions to closed state', function () {
            var stream = createStream('client');

            stream.state = protocol.STATE_RESERVED_REMOTE;
            stream.sendRstStreamFrame(protocol.CODE_NO_ERROR);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('sending PRIORITY', function () {
          it('does nothing', function () {
            var stream = createStream('server');

            stream.state = protocol.STATE_RESERVED_REMOTE;
            stream.sendPriorityFrame(1, 8, false);
            expect(stream.state).to.be(protocol.STATE_RESERVED_REMOTE);
          });
        });

        context('sending frames other than RST_STREAM or PRIORITY', function () {
          it('throws implementation error', function () {
            var stream = createStream('server');

            stream.state = protocol.STATE_RESERVED_REMOTE;
            expect(function(){
              stream.sendDataFrame('test');
            }).to.throwError();
          });
        });

        context('receiving RST_STREAM', function () {
          it('transitions to closed state', function () {
            var stream = createStream('client');

            var frame = framer.createRstStreamFrame();
            frame.streamId = 1;
            frame.setErrorCode(protocol.CODE_NO_ERROR);

            stream.state = protocol.STATE_RESERVED_REMOTE;
            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('receiving frames other than HEADERS or RST_STREAM', function () {
          it('emits PROTOCOL_ERROR connection error', function (done) {
            var stream = createStream('client');

            var frame = framer.createDataFrame();
            frame.streamId = 2;
            frame.setData('test');

            stream.on('error', function (err) {
              expect(err).to.be(protocol.CODE_PROTOCOL_ERROR);
              done();
            });

            stream.state = protocol.STATE_RESERVED_REMOTE;
            stream.process(frame);
          });
        });
      });

      describe('open state', function () {
        context('sending HEADERS with END_STREAM flag', function () {
          it('transitions to half closed (local) state', function () {
            var stream = createStream('client');
            var headers = [
              [ ':status', '200' ],
            ];

            stream.state = protocol.STATE_OPEN;
            stream.sendHeadersFrame(headers, { endStream: true });
            expect(stream.state).to.be(protocol.STATE_HALF_CLOSED_LOCAL);
          });
        });

        context('receiving HEADERS with END_STREAM flag', function () {
          it('transitions to half closed (remote) state', function () {
            var stream = createStream('server');

            var headerBlock = new Buffer([
              0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
              0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
              0x2e, 0x63, 0x6f, 0x6d
            ]);

            var frame = framer.createHeadersFrame();
            frame.streamId = 1;
            frame.endStream = true;
            frame.endHeaders = true;
            frame.setHeaderBlockFragment(headerBlock);

            stream.state = protocol.STATE_OPEN;
            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_HALF_CLOSED_REMOTE);
          });
        });

        context('sending DATA with END_STREAM flag', function () {
          it('transitions to half closed (local) state', function () {
            var stream = createStream('client');

            stream.state = protocol.STATE_OPEN;
            stream.sendDataFrame('test', { endStream: true });
            expect(stream.state).to.be(protocol.STATE_HALF_CLOSED_LOCAL);
          });
        });

        context('receiving DATA with END_STREAM flag', function () {
          it('transitions to half closed (remote) state', function () {
            var stream = createStream('server');

            var frame = framer.createDataFrame();
            frame.streamId = 2;
            frame.endStream = true;
            frame.setData('test');

            stream.state = protocol.STATE_OPEN;
            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_HALF_CLOSED_REMOTE);
          });
        });

        context('sending RST_STREAM', function () {
          it('transitions to closed state', function () {
            var stream = createStream('server');

            stream.state = protocol.STATE_OPEN;
            stream.sendRstStreamFrame(protocol.CODE_NO_ERROR);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('receiving RST_STREAM', function () {
          it('transitions to closed state', function () {
            var stream = createStream('server');

            var frame = framer.createRstStreamFrame();
            frame.streamId = 1;
            frame.setErrorCode(protocol.CODE_NO_ERROR);

            stream.state = protocol.STATE_OPEN;
            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });
      });

      describe('half closed (local) state', function () {
        context('receiving HEADERS with END_STREAM flag', function () {
          it('transitions to closed state', function () {
            var stream = createStream('client');

            var headerBlock = new Buffer([
              0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
              0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
              0x2e, 0x63, 0x6f, 0x6d
            ]);

            var frame = framer.createHeadersFrame();
            frame.streamId = 1;
            frame.endStream = true;
            frame.endHeaders = true;
            frame.setHeaderBlockFragment(headerBlock);

            stream.state = protocol.STATE_HALF_CLOSED_LOCAL;
            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('receiving DATA with END_STREAM flag', function () {
          it('transitions to closed state', function () {
            var stream = createStream('client');

            var frame = framer.createDataFrame();
            frame.streamId = 2;
            frame.endStream = true;
            frame.setData('test');

            stream.state = protocol.STATE_HALF_CLOSED_LOCAL;
            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('receiving RST_STREAM', function () {
          it('transitions to closed state', function () {
            var stream = createStream('server');

            var frame = framer.createRstStreamFrame();
            frame.streamId = 1;
            frame.setErrorCode(protocol.CODE_NO_ERROR);

            stream.state = protocol.STATE_HALF_CLOSED_LOCAL;
            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('sending RST_STREAM', function () {
          it('transitions to closed state', function () {
            var stream = createStream('server');

            stream.state = protocol.STATE_HALF_CLOSED_LOCAL;
            stream.sendRstStreamFrame(protocol.CODE_NO_ERROR);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('sending any frames', function () {
          it('throws implementation error', function () {
            var stream = createStream('server');

            stream.state = protocol.STATE_HALF_CLOSED_LOCAL;
            expect(function(){
              stream.sendDataFrame('test');
            }).to.throwError();
          });
        });
      });

      describe('half closed (remote) state', function () {
        context('sending HEADERS with END_STREAM flag', function () {
          it('transitions to closed state', function () {
            var stream = createStream('server');
            var headers = [
              [ ':status', '200' ],
            ];

            stream.state = protocol.STATE_HALF_CLOSED_REMOTE;
            stream.sendHeadersFrame(headers, { endStream: true });
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('sending DATA with END_STREAM flag', function () {
          it('transitions to closed state', function () {
            var stream = createStream('client');

            stream.state = protocol.STATE_HALF_CLOSED_REMOTE;
            stream.sendDataFrame('test', { endStream: true });
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('receiving RST_STREAM', function () {
          it('transitions to closed state', function () {
            var stream = createStream('client');

            var frame = framer.createRstStreamFrame();
            frame.streamId = 1;
            frame.setErrorCode(protocol.CODE_NO_ERROR);

            stream.state = protocol.STATE_HALF_CLOSED_REMOTE;
            stream.process(frame);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('sending RST_STREAM', function () {
          it('transitions to closed state', function () {
            var stream = createStream('client');

            stream.state = protocol.STATE_HALF_CLOSED_REMOTE;
            stream.sendRstStreamFrame(protocol.CODE_NO_ERROR);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('receiving frames other than CONTINUATION or RST_STREAM', function () {
          it('emits STREAM_CLOSED stream error', function (done) {
            var stream = createStream('client');

            var frame = framer.createDataFrame();
            frame.streamId = 2;
            frame.setData('test');

            stream.on('error', function (err) {
              expect(err).to.be(protocol.CODE_STREAM_CLOSED);
              done();
            });

            stream.state = protocol.STATE_HALF_CLOSED_REMOTE;
            stream.process(frame);
          });
        });
      });

      describe('closed state', function () {
        context('sending PRIORITY', function () {
          it('does nothing', function () {
            var stream = createStream('server');

            stream.state = protocol.STATE_CLOSED;
            stream.sendPriorityFrame(1, 8, false);
            expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('sending any frames other than PRIORITY', function () {
          it('throws implementation error', function () {
            var stream = createStream('server');

            stream.state = protocol.STATE_CLOSED;
            expect(function(){
              stream.sendDataFrame('test');
            }).to.throwError();
          });
        });

        context('receiving PRIORITY', function () {
          it('does nothing', function () {
             var stream = createStream('client');

             var frame = framer.createPriorityFrame();
             frame.streamId = 2;
             frame.setPriority(1, 8, false);

             stream.state = protocol.STATE_CLOSED;
             stream.process(frame);
             expect(stream.state).to.be(protocol.STATE_CLOSED);
          });
        });

        context('receiving any frames other than PRIORITY after closed', function () {
          it('emits STREAM_CLOSED stream error', function (done) {
            var stream = createStream('client');

            var frame = framer.createDataFrame();
            frame.streamId = 2;
            frame.setData('test');

            stream.on('error', function (err) {
              expect(err).to.be(protocol.CODE_STREAM_CLOSED);
              done();
            });

            stream.state = protocol.STATE_CLOSED;
            stream.closed = true;
            stream.process(frame);
          });
        });
      });
    });
  });
});