
'use strict';

var expect = require('chai').expect,
    sinon = require('sinon'),
    redis = require('redis'),
    Queue = require('../src/queue') 
;

describe('Queue', function() {

  beforeEach(function() {

    sinon.stub(redis, 'createClient').returns({});
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
  });

});
