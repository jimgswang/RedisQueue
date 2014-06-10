
'use strict';

var expect = require('chai').expect,
    sinon = require('sinon'),
    redis = require('redis'),
    async = require('async'),
    Queue = require('../src/queue'),
    EventEmitter = require('events').EventEmitter
;

describe('Queue', function() {

  beforeEach(function() {

    sinon.stub(redis, 'createClient').returns(new EventEmitter());
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

    it('should emit error when redis client emits error', function(done) {

      var queue = new Queue('test', {host: 'foo', port: 1234 }),
          error = new Error()
      ;

      queue.on('error', function(err) {
        expect(err).to.equal(error);
        done();
      });

      queue._client.emit('error', error);

    });
  });

  describe('methods', function() {

    var queue,
        client
    ;

    beforeEach(function() {
      queue = new Queue('test', {});
      client = queue._client;

    });

    describe('.enqueue', function() {

      beforeEach(function() {
        queue._client.incr = new sinon.stub();
        queue._client.hmset = new sinon.stub();
        queue._client.rpush = new sinon.stub();

      });


      it('should execute callback', function(done) {

        queue.enqueue({}, done);

        client.incr.yields(null, 1);
        client.hmset.yields(null, true);
        client.rpush.yields(null, true);

      });
    });

  });

});
