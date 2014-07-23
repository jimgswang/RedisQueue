
'use strict';

var expect = require('chai').expect,
    sinon = require('sinon'),
    redis = require('redis'),
    async = require('async'),
    Queue = require('../src/queue'),
    EventEmitter = require('events').EventEmitter,
    config = require('../config')
;

describe('Queue', function() {

  beforeEach(function() {

    var stub = sinon.stub(redis, 'createClient');

    stub.onFirstCall().returns(new EventEmitter());
    stub.onSecondCall().returns(new EventEmitter());
  });

  afterEach(function() {

    redis.createClient.restore();
  });

  describe('initialization', function() {

    it('should initialize to defaults', function() {

      var queue = new Queue('test', {});
      expect(queue.host).to.equal('127.0.0.1');
      expect(queue.port).to.equal(6327);
    });

    it('creates a new redis client with supplied options', function() {

      var queue = new Queue('test', {host: 'foo', port: 1234 });

      expect(queue.host).to.equal('foo');
      expect(queue.port).to.equal(1234);
      sinon.assert.calledWith(redis.createClient, 1234, 'foo');
    
    });

    it('should emit error when non blocking redis client emits error', function(done) {

      var queue = new Queue('test', {host: 'foo', port: 1234 }),
          error = new Error()
      ;

      queue.on('error', function(err) {
        expect(err).to.equal(error);
        done();
      });

      queue._nbclient.emit('error', error);
    });

    it('should emit error when blocking redis client emits error', function(done) {

      var queue = new Queue('test', {host: 'foo', port: 1234 }),
          error = new Error()
      ;

      queue.on('error', function(err) {
        expect(err).to.equal(error);
        done();
      });

      queue._bclient.emit('error', error);
    });
  });

  describe('methods', function() {

    var queue,
        nbclient,
        bclient
    ;

    beforeEach(function() {
      queue = new Queue('test', {});
      nbclient = queue._nbclient;
      bclient = queue._bclient;

      nbclient.incr = new sinon.stub();
      nbclient.hmset = new sinon.stub();
      nbclient.lpush = new sinon.stub();
    });

    describe('.enqueue', function() {

      it('should execute callback', function(done) {

        queue.enqueue({}, done);

        nbclient.incr.yields(null, 1);
        nbclient.hmset.yields(null, true);
        nbclient.lpush.yields(null, true);

      });
    });

    describe('.lock', function() {

      beforeEach(function () {
        this.clock = sinon.useFakeTimers(); 
        queue._nbclient.set = new sinon.stub();
      });

      afterEach(function() {
        this.clock.restore();
      });

      it('should execute callback', function(done) {

        queue.lock('1', false, done);
        nbclient.set.yield(null, 'OK');

      });

      it('should renew lock by lockTimeout', function(done) {

        var self = this
        ;
        queue.lock('1', false, function() {

         var spy = sinon.spy(queue, 'lock');
         self.clock.tick(config.lockTime);
         sinon.assert.called(spy);
         sinon.assert.alwaysCalledWith(spy, '1', true);
         done();

        });

        nbclient.set.yield(null, 'OK');
      });

    });

    describe('.unlock', function() {

      beforeEach(function() {
        this.clock = sinon.useFakeTimers(); 
        nbclient.set = new sinon.stub();
        nbclient.eval = new sinon.stub();
      });

      afterEach(function() {

        this.clock.restore();
      });

      it('should execute callback', function(done) {

        queue.unlock('1', done);
        nbclient.eval.yield(null, 'OK');
      });

      it('stops future calls to lock', function(done) {

        var self = this
        ;

        queue.lock('1', false, function() {
          queue.unlock('1', function() {
            var spy = sinon.spy(queue, 'lock');
            self.clock.tick(config.lockTime * 2);
            sinon.assert.notCalled(spy);
            done();
          });
        });

        nbclient.set.yield(null, 'OK');
        nbclient.eval.yield(null, 'OK');
      });

    });


    describe('dequeue', function() {

      beforeEach(function() {

        bclient.brpoplpush = sinon.stub();
        nbclient.set = sinon.stub();
        nbclient.hgetall = sinon.stub();
        nbclient.eval = sinon.stub();
        nbclient.multi = sinon.stub().returns({
          lrem : sinon.stub().returns({
            lpush : sinon.stub().returns({
              exec : sinon.stub().yields(null, [])
            })
          })
        });
      });

      it('is passed a done callback to signal task completion', function(finished) {

        queue.dequeue(function(task, done) {

          done(finished);
        });

        bclient.brpoplpush.onFirstCall().yields(null, 1);
        nbclient.set.yields(null, 'OK');
        nbclient.hgetall.yields(null, {foo:'bar'});
        nbclient.eval.yields(null, 'OK');

      });

    }); // end describe
  });
});
