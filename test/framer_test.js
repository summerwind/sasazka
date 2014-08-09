var expect = require('expect.js');

var framer = require('../lib/framer'),
    protocol = require('../lib/protocol');

describe('Framer', function () {
  describe('DATA Frame', function () {
    describe('encode()', function () {
      it('returns buffer', function () {
        var expected = new Buffer([
          0x00, 0x00, 0x0d, 0x00, 0x0b, 0x00, 0x00, 0x00,
          0x01, 0x08, 0x54, 0x65, 0x73, 0x74, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]);

        var frame = framer.createDataFrame();
        frame.streamId = 1;
        frame.endStream = true;
        frame.endSegment = true;
        frame.setData('Test');
        frame.setPadding(8);

        var encodedFrame = frame.encode();
        var length = frame.length + protocol.FRAME_HEADER_LEN;

        expect(encodedFrame.length).to.be(length);
        expect(encodedFrame).to.eql(expected);
      });
    });

    describe('decode()', function () {
      it('returns DATA Frame object', function () {
        var encodedFrame = new Buffer([
          0x00, 0x00, 0x0d, 0x00, 0x0b, 0x00, 0x00, 0x00,
          0x01, 0x08, 0x54, 0x65, 0x73, 0x74, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]);

        var frame = framer.decodeFrame(encodedFrame);
        var length = encodedFrame.length - protocol.FRAME_HEADER_LEN;

        expect(frame.length).to.be(length);
        expect(frame.streamId).to.be(1);
        expect(frame.endStream).to.be(true);
        expect(frame.endSegment).to.be(true);
        expect(frame.data).to.eql(new Buffer('Test'));
        expect(frame.padding).to.be(8);
      });
    });
  });

  describe('HEADERS Frame', function () {
    describe('encode()', function () {
      it('returns buffer', function () {
        var expected = new Buffer([
          0x00, 0x00, 0x22, 0x01, 0x2d, 0x00, 0x00, 0x00,
          0x03, 0x08, 0x80, 0x00, 0x00, 0x01, 0x05, 0x82,
          0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77, 0x2e,
          0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65, 0x2e,
          0x63, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00
        ]);

        var headerBlock = new Buffer([
          0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
          0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
          0x2e, 0x63, 0x6f, 0x6d
        ]);

        var frame = framer.createHeadersFrame();
        frame.streamId = 3;
        frame.endStream = true;
        frame.endHeaders = true;
        frame.setPriority(1, 5, true);
        frame.setHeaderBlockFragment(headerBlock);
        frame.setPadding(8);

        var encodedFrame = frame.encode();
        var length = frame.length += protocol.FRAME_HEADER_LEN;

        expect(encodedFrame.length).to.be(length);
        expect(encodedFrame).to.eql(expected);
      });
    });

    describe('decode()', function () {
      it('returns HEADERS Frame object', function () {
        var encodedFrame = new Buffer([
          0x00, 0x00, 0x22, 0x01, 0x2d, 0x00, 0x00, 0x00,
          0x03, 0x08, 0x80, 0x00, 0x00, 0x01, 0x05, 0x82,
          0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77, 0x2e,
          0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65, 0x2e,
          0x63, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00
        ]);

        var headerBlock = new Buffer([
          0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
          0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
          0x2e, 0x63, 0x6f, 0x6d
        ]);

        var frame = framer.decodeFrame(encodedFrame);
        var length = encodedFrame.length - protocol.FRAME_HEADER_LEN;

        expect(frame.length).to.be(length);
        expect(frame.streamId).to.be(3);
        expect(frame.endStream).to.be(true);
        expect(frame.endHeaders).to.be(true);
        expect(frame.priority).to.be(true);
        expect(frame.headerBlockFragment).to.eql(headerBlock);
        expect(frame.exclusive).to.be(true);
        expect(frame.streamDependency).to.be(1);
        expect(frame.weight).to.be(5);
        expect(frame.padding).to.be(8);
      });
    });
  });

  describe('PRIORITY Frame', function () {
    describe('encode()', function () {
      it('returns buffer', function () {
        var expected = new Buffer([
          0x00, 0x00, 0x05, 0x02, 0x00, 0x00, 0x00, 0x00,
          0x03, 0x80, 0x00, 0x00, 0x01, 0x08
        ]);

        var frame = framer.createPriorityFrame();
        frame.streamId = 3;
        frame.setPriority(1, 8, true);

        var encodedFrame = frame.encode();
        var length = frame.length += protocol.FRAME_HEADER_LEN;

        expect(encodedFrame.length).to.be(length);
        expect(encodedFrame).to.eql(expected);
      });
    });

    describe('decode()', function () {
      it('returns PRIORITY Frame object', function () {
        var encodedFrame = new Buffer([
          0x00, 0x00, 0x05, 0x02, 0x00, 0x00, 0x00, 0x00,
          0x03, 0x80, 0x00, 0x00, 0x01, 0x08
        ]);

        var frame = framer.decodeFrame(encodedFrame);
        var length = encodedFrame.length - protocol.FRAME_HEADER_LEN;

        expect(frame.length).to.be(length);
        expect(frame.streamId).to.be(3);
        expect(frame.streamDependency).to.be(1);
        expect(frame.weight).to.be(8);
        expect(frame.exclusive).to.be(true);
      });
    });
  });

  describe('RST_STREAM Frame', function () {
    describe('encode()', function () {
      it('returns buffer', function () {
        var expected = new Buffer([
          0x00, 0x00, 0x04, 0x03, 0x00, 0x00, 0x00, 0x00,
          0x01, 0x00, 0x00, 0x00, 0x01
        ]);

        var frame = framer.createRstStreamFrame();
        frame.streamId = 1;
        frame.setErrorCode(protocol.CODE_PROTOCOL_ERROR);

        var encodedFrame = frame.encode();
        var length = frame.length += protocol.FRAME_HEADER_LEN;

        expect(encodedFrame.length).to.be(length);
        expect(encodedFrame).to.eql(expected);
      });
    });

    describe('decode()', function () {
      it('returns RST_STREAM Frame object', function () {
        var encodedFrame = new Buffer([
          0x00, 0x00, 0x04, 0x03, 0x00, 0x00, 0x00, 0x00,
          0x01, 0x00, 0x00, 0x00, 0x01
        ]);

        var frame = framer.decodeFrame(encodedFrame);
        var length = encodedFrame.length - protocol.FRAME_HEADER_LEN;

        expect(frame.length).to.be(length);
        expect(frame.streamId).to.be(1);
        expect(frame.errorCode).to.be(protocol.CODE_PROTOCOL_ERROR);
      });
    });
  });

  describe('SETTINGS Frame', function () {
    describe('encode()', function () {
      it('returns buffer', function () {
        var expected = new Buffer([
          0x00, 0x00, 0x0c, 0x04, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x03, 0x00, 0x00, 0x00, 0x64
        ]);

        var frame = framer.createSettingsFrame();
        frame.setEnablePush(false);
        frame.setMaxConcurrentStreams(100);

        var encodedFrame = frame.encode();
        var length = frame.length += protocol.FRAME_HEADER_LEN;

        expect(encodedFrame.length).to.be(length);
        expect(encodedFrame).to.eql(expected);
      });
    });

    describe('decode()', function () {
      it('returns SETTINGS Frame object', function () {
        var encodedFrame = new Buffer([
          0x00, 0x00, 0x0c, 0x04, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x03, 0x00, 0x00, 0x00, 0x64
        ]);

        var frame = framer.decodeFrame(encodedFrame);
        var length = encodedFrame.length - protocol.FRAME_HEADER_LEN;

        expect(frame.length).to.be(length);
        expect(frame.streamId).to.be(0);
        expect(frame.ack).to.be(false);
        expect(frame.headerTableSize).to.be(4096);
        expect(frame.enablePush).to.be(false);
        expect(frame.maxConcurrentStreams).to.eql(100);
        expect(frame.initialWindowSize).to.be(65535);
      });
    });
  });

  describe('PUSH_PROMISE Frame', function () {
    describe('encode()', function () {
      it('returns buffer', function () {
        var expected = new Buffer([
          0x00, 0x00, 0x21, 0x05, 0x0c, 0x00, 0x00, 0x00,
          0x01, 0x08, 0x00, 0x00, 0x00, 0x03, 0x82, 0x87,
          0x86, 0x44, 0x0f, 0x77, 0x77, 0x77, 0x2e, 0x65,
          0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65, 0x2e, 0x63,
          0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00
        ]);

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
        frame.setPadding(8);

        var encodedFrame = frame.encode();
        var length = frame.length += protocol.FRAME_HEADER_LEN;

        expect(encodedFrame.length).to.be(length);
        expect(encodedFrame).to.eql(expected);
      });
    });

    describe('decode()', function () {
      it('returns PUSH_PROMISE Frame object', function () {
        var encodedFrame = new Buffer([
          0x00, 0x00, 0x21, 0x05, 0x0c, 0x00, 0x00, 0x00,
          0x01, 0x08, 0x00, 0x00, 0x00, 0x03, 0x82, 0x87,
          0x86, 0x44, 0x0f, 0x77, 0x77, 0x77, 0x2e, 0x65,
          0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65, 0x2e, 0x63,
          0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00
        ]);

        var headerBlock = new Buffer([
          0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
          0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
          0x2e, 0x63, 0x6f, 0x6d
        ]);

        var frame = framer.decodeFrame(encodedFrame);
        var length = encodedFrame.length - protocol.FRAME_HEADER_LEN;

        expect(frame.length).to.be(length);
        expect(frame.streamId).to.be(1);
        expect(frame.endHeaders).to.be(true);
        expect(frame.promisedStreamId).to.be(3);
        expect(frame.headerBlockFragment).to.eql(headerBlock);
        expect(frame.padding).to.eql(8);
      });
    });
  });

  describe('PING Frame', function () {
    describe('encode()', function () {
      it('returns buffer', function () {
        var expected = new Buffer([
          0x00, 0x00, 0x08, 0x06, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x74, 0x65, 0x73, 0x74, 0x00, 0x00, 0x00,
          0x00
        ]);

        var frame = framer.createPingFrame();
        frame.setOpaqueData('test');

        var encodedFrame = frame.encode();
        var length = frame.length += protocol.FRAME_HEADER_LEN;

        expect(encodedFrame.length).to.be(length);
        expect(encodedFrame).to.eql(expected);
      });
    });

    describe('decode()', function () {
      it('returns PING Frame object', function () {
        var encodedFrame = new Buffer([
          0x00, 0x00, 0x08, 0x06, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x74, 0x65, 0x73, 0x74, 0x00, 0x00, 0x00,
          0x00
        ]);

        var expected = new Buffer(8);
        expected.fill(0);
        expected.write('test');

        var frame = framer.decodeFrame(encodedFrame);
        var length = encodedFrame.length - protocol.FRAME_HEADER_LEN;

        expect(frame.length).to.be(length);
        expect(frame.streamId).to.be(0);
        expect(frame.opaqueData).to.eql(expected);
      });
    });
  });

  describe('GOAWAY Frame', function () {
    describe('encode()', function () {
      it('returns buffer', function () {
        var expected = new Buffer([
          0x00, 0x00, 0x17, 0x07, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00,
          0x01, 0x53, 0x6f, 0x6d, 0x65, 0x74, 0x68, 0x69,
          0x6e, 0x67, 0x20, 0x77, 0x72, 0x6f, 0x6e, 0x67
        ]);

        var frame = framer.createGoawayFrame();
        frame.lastStreamId = 3;
        frame.errorCode = protocol.CODE_PROTOCOL_ERROR;
        frame.setDebugData('Something wrong');

        var encodedFrame = frame.encode();
        var length = frame.length += protocol.FRAME_HEADER_LEN;

        expect(encodedFrame.length).to.be(length);
        expect(encodedFrame).to.eql(expected);
      });
    });

    describe('decode()', function () {
      it('returns GOAWAY Frame object', function () {
        var encodedFrame = new Buffer([
          0x00, 0x00, 0x17, 0x07, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00,
          0x01, 0x53, 0x6f, 0x6d, 0x65, 0x74, 0x68, 0x69,
          0x6e, 0x67, 0x20, 0x77, 0x72, 0x6f, 0x6e, 0x67
        ]);

        var frame = framer.decodeFrame(encodedFrame);
        var length = encodedFrame.length - protocol.FRAME_HEADER_LEN;

        expect(frame.length).to.be(length);
        expect(frame.streamId).to.be(0);
        expect(frame.lastStreamId).to.be(3);
        expect(frame.errorCode).to.be(protocol.CODE_PROTOCOL_ERROR);
        expect(frame.debugData).to.eql(new Buffer('Something wrong'));
      });
    });
  });

  describe('WINDOW_UPDATE Frame', function () {
    describe('encode()', function () {
      it('returns buffer', function () {
        var expected = new Buffer([
          0x00, 0x00, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x64
        ]);

        var frame = framer.createWindowUpdateFrame();
        frame.lastStreamId = 3;
        frame.setWindowSizeIncrement(100);

        var encodedFrame = frame.encode();
        var length = frame.length += protocol.FRAME_HEADER_LEN;

        expect(encodedFrame.length).to.be(length);
        expect(encodedFrame).to.eql(expected);
      });
    });

    describe('decode()', function () {
      it('returns WINDOW_UPDATE Frame object', function () {
        var encodedFrame = new Buffer([
          0x00, 0x00, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x64
        ]);

        var frame = framer.decodeFrame(encodedFrame);
        var length = encodedFrame.length - protocol.FRAME_HEADER_LEN;

        expect(frame.length).to.be(length);
        expect(frame.windowSizeIncrement).to.be(100);
      });
    });
  });

  describe('CONTINUATION Frame', function () {
    describe('encode()', function () {
      it('returns buffer', function () {
        var expected = new Buffer([
          0x00, 0x00, 0x14, 0x09, 0x04, 0x00, 0x00, 0x00,
          0x01, 0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77,
          0x77, 0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c,
          0x65, 0x2e, 0x63, 0x6f, 0x6d
        ]);

        var headerBlock = new Buffer([
          0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
          0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
          0x2e, 0x63, 0x6f, 0x6d
        ]);

        var frame = framer.createContinuationFrame();
        frame.streamId = 1;
        frame.endHeaders = true;
        frame.setHeaderBlockFragment(headerBlock);

        var encodedFrame = frame.encode();
        var length = frame.length += protocol.FRAME_HEADER_LEN;

        expect(encodedFrame.length).to.be(length);
        expect(encodedFrame).to.eql(expected);
      });
    });

    describe('decode()', function () {
      it('returns CONTINUATION Frame object', function () {
        var encodedFrame = new Buffer([
          0x00, 0x00, 0x14, 0x09, 0x04, 0x00, 0x00, 0x00,
          0x01, 0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77,
          0x77, 0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c,
          0x65, 0x2e, 0x63, 0x6f, 0x6d
        ]);

        var headerBlock = new Buffer([
          0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
          0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
          0x2e, 0x63, 0x6f, 0x6d
        ]);

        var frame = framer.decodeFrame(encodedFrame);
        var length = encodedFrame.length - protocol.FRAME_HEADER_LEN;

        expect(frame.length).to.be(length);
        expect(frame.streamId).to.be(1);
        expect(frame.endHeaders).to.be(true);
        expect(frame.headerBlockFragment).to.eql(headerBlock);
      });
    });
  });
});
