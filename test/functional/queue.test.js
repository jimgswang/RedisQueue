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
      port: process.env.REDIS_PORT,
      retry: 2
    });

    data = {
      foo: 'bar'
    };

    client = queue._nbclient;
    client.flushdb(done);

  });

  afterEach(function(done) {
    queue._bclient.end();
    queue.unlock('1', function(err, res) {
      done();
    });

    queue = null;
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
        queue2.unlock('1', done);
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

  describe('.unlock', function() {

    it('removes a lock', function(done) {

      queue.lock('1', false, function() {

        queue.unlock('1', function() {

          client.get(queue.getKeyForId('1') + ':lock', function(err, res) {
            expect(res).to.be.null;
            done();
          });
        });

      });
    });
  });


  describe('.dequeue', function() {

    beforeEach(function(done) {

      queue.enqueue(data, done);
    });

    it('moves job id to completed when done', function(done) {

      queue.dequeue(function(task) {
        // do some work
        //
        task.done(function() {
          client.multi()
            .lrem(queue.keys.completed, 0, task.id)
            .lrem(queue.keys.working, 0, task.id)
            .lrem(queue.keys.failed, 0, task.id)
            .exec(function(err, res) {

              expect(res[0]).to.equal(1);
              expect(res[1]).to.equal(0);
              expect(res[2]).to.equal(0);
              done();
            });
        });
      });

    });

    it('moves job id to failed when done is called with err', function(done) {

      var err = new Error('something failed');
      queue.dequeue(function(task) {
        task.done(err, function() {

          client.multi()
            .lrem(queue.keys.failed, 0, task.id)
            .lrem(queue.keys.working, 0, task.id)
            .lrem(queue.keys.completed, 0, task.id)
            .exec(function(err, res) {
              expect(res[0]).to.equal(1);
              expect(res[1]).to.equal(0);
              expect(res[2]).to.equal(0);
              done();
            });
        });
      });
    });

    it('receives the correct data', function(done) {

      queue.dequeue(function(task) {
        expect(task.id).to.equal('1');
        expect(task.data).to.deep.equal(data);
        task.done();
        done();

      });
    });

    it('executes multiple tasks in order', function(done) {
      
      var counter = 0
      ;

      async.series([
        function(callback) {

          queue.enqueue(data, callback);
        },

        function(callback) {

          queue.dequeue(function(task) {

            counter++;

            task.done(function() {
              if(counter === 2) {
                client.llen(queue.keys.completed, function(err, res) {
                  expect(res).to.equal(2);
                  callback(null);
                });
              }
            });
          });
        }
      ],
      function() {
        done();
      });

    });
    
    it('doesnt retry completed task',  function(done) {
      
      var counter = 0
      ;

      queue.dequeue(function(task) {
        counter++;
        task.done();
      });

      queue.on('complete', function(task) {
        expect(counter).to.equal(1);
        done();
      });

      queue.on('fail', function() {
        throw new Error('should not trigger fail event');
      });
    });

    it('retries failed tasks correct amount of times', function(done) {
      
      var counter = 0,
          fails = 0
      ;

      queue.dequeue(function(task) {

        if(counter < 2) {

          counter++;
          task.done(new Error());
        }
        else {
          task.done();
        }
      });

      queue.on('complete', function(task) {
        expect(counter).to.equal(2);
        expect(fails).to.equal(2);
        done();
      });

      // should fire fail twice
      queue.on('fail', function() {
        fails++;
      });
    });
    
  });// end describe

});
