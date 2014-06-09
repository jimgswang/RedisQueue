'use strict';

var redis = require('redis'),
    expect = require('chai').expect,
    Queue = require('../../src/queue')
;

describe('set up', function() {

  it('should have host and port set in ENV variables', function() {

    expect(process.env.REDIS_HOST).to.not.be.empty;
    expect(process.env.REDIS_PORT).to.not.be.empty;
  });

});
describe('RedisQueue', function() {

  var queue,
      client
  ;

  beforeEach(function(done) {

    queue = new Queue('test', {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    });

    client = queue._client;
    queue._client.flushdb(done);
  });

  describe('.enqueue', function() {

    it('creates new id in redis', function(done) {

      queue.enqueue({foo: 'bar'}, function() {
        client.get(queue._prefix + "id", function(err, res) {
          expect(res).to.equal('1');
          done();
        });
      });
    });

    it('sets the task data', function(done) {

      var data = { foo: 'bar' }
      ;

      queue.enqueue(data, function() {
        client.hgetall(queue._prefix + '1', function(err, res) {
          expect(res).to.deep.equal(data);
          done();
        });
      });
    });


  });

});
