'use strict';

var redis = require('redis'),
    expect = require('chai').expect,
    Queue = require('../../src/queue'),
    async = require('async')
;

describe('set up', function() {

  it('should have host and port set in ENV variables', function() {

    expect(process.env.REDIS_HOST).to.not.be.empty;
    expect(process.env.REDIS_PORT).to.not.be.empty;
  });

});
describe('RedisQueue', function() {

  var queue,
      client,
      data
  ;

  beforeEach(function(done) {

    queue = new Queue('test', {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    });

    data = {
      foo: 'bar'
    };

    client = queue._client;
    queue._client.flushdb(done);
  });

  describe('.enqueue', function() {

    it('creates new id in redis', function(done) {

      queue.enqueue(data, function() {
        client.get(queue.keys.id, function(err, res) {
          expect(res).to.equal('1');
          done();
        });
      });
    });

    it('sets the task data', function(done) {

      queue.enqueue(data, function() {
        client.hgetall(queue.getKeyForId(1), function(err, res) {
          expect(res).to.deep.equal(data);
          done();
        });
      });
    });

    it('pushes job id into waiting list', function(done) {

      queue.enqueue(data, function() {
        client.rpop(queue.keys.waiting, function(err, res) {
          expect(res).to.equal('1');
          done();
        });
      });
    });

  });


  describe('.lock', function() {

    it('sets a lock for the specified task id', function(done) {

      queue.lock('1', false, function(err, res) {

        var key = queue.getKeyForId('1') + ':lock';

        client.get(key, function(err, res) {
          expect(res).to.not.be.empty;
          done();
        });

      });
    });

    it('errors if another queue tries to lock locked id', function(done) {

      var queue2 = new Queue('test', {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
      });

      queue2.on('error', function(err) {

        expect(err).to.not.be.empty;
        done();
      });

      queue.lock('1', false, function() {
        queue2.lock('1', false);
      });
    });

    it('can renew lock', function(done) {

      async.series([
        function(callback) {
          queue.lock('1', false, callback);
        },
        function(callback) {
          queue.lock('1', true, callback);
        }
      ], function(err, results) {

        expect(results[0]).to.equal('OK');
        expect(results[1]).to.equal('OK');
        done();
      });
    });
  });
});
