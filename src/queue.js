
'use strict';

var redis = require('redis'),
    Task = require('./task'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    async = require('async'),
    _ = require('lodash')

;

/** 
 * Make a new redis queue
 * @constructor
 * @param {String} queueName - the name of the queue
 * @param {Object} options - Hash of options
 *                            .host: hostname of redis server
 *                            .port: port server listening on
 */
function Rq(queueName, options) {

  var self = this
  ;

  this.host = options.host || '127.0.0.1';
  this.port = options.port || 6327;
  this.queue = queueName;

  this._prefix = 'rq:' + queueName + ':';
  this._client = redis.createClient(this.port, this.host);

  this.keys = {
    id : this._prefix + 'id',
    waiting : this._prefix + 'waiting'
  };

  this._client.on('error', function(err) {
    self.emit('error', err);
  });

  EventEmitter.call(this);
}

util.inherits(Rq, EventEmitter);


/**
 * Add new task to the queue
 * @param {Object} data - the hash associated with queue'd task
 * @param {Function} [callback] - the callback to execute
 */
Rq.prototype.enqueue = function (data, callback) {

  var self = this,
      cb = callback || _.noop(),
      taskId
  ;
  
  if(typeof cb !== 'function') {
    throw new TypeError('callback must be a function');
  }


  async.waterfall([
    function(callback) {
      self._client.incr(self.keys.id, callback);
    },
    function(id, callback) {
      taskId = id;
      self._client.hmset(self.getKeyForId(id), data, callback);
    },
    function(res, callback) {
      self._client.lpush(self.keys.waiting, taskId, callback);
    }
  ], function(err, result) {
    cb();
  });
    
};


/**
 * Get the next task in queue and process it
 * @param {Function} handler - the function to process the task,
 *                             it receives a task param
 */
Rq.prototype.dequeue = function(handler) {

  if(typeof handler !== 'function') {
    throw new TypeError('handler must be a function');
  }



};
/** 
 * Get the redis key for a task id
 * @param {Number} id - the task id
 * @returns {String} the redis key
 */
Rq.prototype.getKeyForId = function(id) {
  return this._prefix + id;
};


module.exports = exports = Rq;
