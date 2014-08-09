var expect = require('expect.js'),
    waitress = require('waitress');

var FlowController = require('../lib/flow_controller'),
    framer = require('../lib/framer'),
    protocol = require('../lib/protocol');

describe('Flow Controller', function () {
  function createController () {
    var controller = new FlowController();
    controller._send = function () {};

    return controller;
  }

  describe('updateInitialWindowSize()', function () {
    it('sets new initial window size', function () {
      var controller = createController();

      var windowSize = 100;

      controller.updateInitialWindowSize(windowSize);
      expect(controller.initialWindowSize).to.be(windowSize);
      expect(controller.currentWindowSize).to.be(windowSize);
    });

    it('sends blocked frames', function (done) {
      var controller = createController();

      var windowSize = 70000;

      var frame = framer.createDataFrame();
      frame.streamId = 3;
      frame.endStream = true;
      frame.setData('test');

      controller.currentWindowSize = 0;
      controller._queue.push(frame);

      controller._send = function (sendFrame) {
        expect(sendFrame).to.eql(frame);
        expect(controller.initialWindowSize).to.be(windowSize);
        expect(controller.currentWindowSize).to.be(4461);
        done();
      };

      controller.updateInitialWindowSize(windowSize);
    });
  });

  describe('increaseWindowSize()', function () {
    it('increases current window size', function () {
      var controller = createController();

      var currentWindowSize = controller.currentWindowSize;
      var windowSize = 100;

      controller.increaseWindowSize(windowSize);
      expect(controller.currentWindowSize).to.be(currentWindowSize + windowSize);
    });

    it('sends blocked frames', function (done) {
      var controller = createController();

      var windowSize = 100;

      var frame = framer.createDataFrame();
      frame.streamId = 3;
      frame.endStream = true;
      frame.setData('test');

      controller.currentWindowSize = 0;
      controller._queue.push(frame);

      controller._send = function (sendFrame) {
        expect(sendFrame).to.eql(frame);
        expect(controller.currentWindowSize).to.be(96);
        done();
      };

      controller.increaseWindowSize(windowSize);
    });
  });

  describe('push()', function () {
    it('sends flow controlled frames', function (done) {
      var controller = createController();

      var frame = framer.createDataFrame();
      frame.streamId = 3;
      frame.endStream = true;
      frame.setData('test');

      controller._send = function (sendFrame) {
        expect(sendFrame).to.eql(frame);
        done();
      };

      controller.push(frame);
    });

    it('blocks flow controlled frames', function () {
      var controller = createController();

      var frame = framer.createDataFrame();
      frame.streamId = 3;
      frame.endStream = true;
      frame.setData('test');

      controller.currentWindowSize = 0;
      controller.push(frame);
      expect(controller._queue[0]).to.be(frame);
    });

    it('splits large flow controlled frames', function (done) {
      var controller = createController();

      var data = '';
      for (var i=0; i<65536; i++) {
        data += 'x';
      }

      var frame = framer.createDataFrame();
      frame.streamId = 3;
      frame.endStream = true;
      frame.setData(data);
      frame.setPadding(8);

      var frames = [];
      var check = waitress(4, function() {
        process.nextTick(function () {
          expect(frames[0].length).to.be(protocol.FRAME_LEN_MAX);
          expect(frames[1].length).to.be(protocol.FRAME_LEN_MAX);
          expect(frames[2].length).to.be(protocol.FRAME_LEN_MAX);
          expect(frames[3].length).to.be(protocol.FRAME_LEN_MAX);
          expect(controller._queue[0].data.length).to.be(40);
          done();
        });
      });

      controller._send = function (sendFrame) {
        frames.push(sendFrame);
        check();
      };

      controller.push(frame);
    });

    it('sends frames immediately', function (done) {
      var controller = createController();

      var headerBlock = new Buffer([
        0x82, 0x87, 0x86, 0x44, 0x0f, 0x77, 0x77, 0x77,
        0x2e, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
        0x2e, 0x63, 0x6f, 0x6d
      ]);

      var frame = framer.createHeadersFrame();
      frame.streamId = 3;
      frame.endHeaders = true;
      frame.setHeaderBlockFragment(headerBlock);

      controller._send = function (sendFrame) {
        expect(sendFrame).to.eql(frame);
        done();
      };

      controller.push(frame);
    });
  });
});
