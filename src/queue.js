
'use strict';

var redis = require('redis'),
    Task = require('./task'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    async = require('async'),
    uuid = require('node-uuid'),
    config = require('../config'),
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
    waiting : this._prefix + 'waiting',
    working : this._prefix + 'working'
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
      cb = callback || _.noop,
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

  var self = this,
      taskId
  ;

  async.waterfall([
    function(callback) {
      // block until we get next task
      self._client.brpoplpush(self.keys.waiting, self.keys.working, callback);
    },
    function(id, callback) {

      taskId = id;
      self.lock(id, callback);
    },
    function(result, callback) {

      if(result === 'OK') {
        self._client.hgetall(self.getKeyForId(taskId), callback);
      }
      else {
        callback(new Error('Could not acquire lock for task id ' + taskId));
      }

    },
    function(data, callback) {

      var task = new Task(taskId, data);
      callback(task);
    }
  ], function(err, result) {

    if(err) {
      self.emit('error', err);
    } 
    else {
      handler(result, _.bind(self.unlock, self, result.id));
    }
  });
};

/** 
 * Get the redis key for a task id
 * @param {Number} id - the task id
 * @returns {String} the redis key
 */
Rq.prototype.getKeyForId = function(id) {
  return this._prefix + id;
};


/**
 * Acquire  a lock for a task id
 * @param {Number} id - the task id
 * @param {Function} [callback] - callback to execute
 */
Rq.prototype.lock = function(id, renew, callback) {

  var x = renew ? 'XX'
                : 'NX',
      key = this.getKeyForId(id) + ':lock',
      self = this,
      lockToken = uuid.v4(),
      cb = callback || _.noop
  ;

  if(typeof cb !== 'function') {
    throw new TypeError('callback must be a function');
  }

  self._client.set(key, lockToken, 'PX', config.lockTime, x, function(err, res) {
    self._checkLockStatus(err, res);
    cb(err, res);
  });

  self.lockTimeout = setTimeout(function() {
    self.lock(id, true, self._checkLockStatus);
  }, config.lockTime / 2);
};


Rq.prototype._checkLockStatus = function(err, result) {

  if(result !== 'OK') {
    this.emit('error', 'Could not acquire lock');
  }
};


/**
 * Release a lock for a task id
 * @param {Number} id - the task id
 */
Rq.prototype.unlock = function(id) {

};

module.exports = exports = Rq;
