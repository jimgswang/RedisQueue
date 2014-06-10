
'use strict';

var redis = require('redis'),
    Task = require('./task'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
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
      cb = callback || _.noop()
  ;
  
  if(typeof cb !== 'function') {
    throw new TypeError('callback must be a function');
  }

  // get new id for task
  this._client.incr(this._prefix + "id", function(err, res) {
    if(err) {
      self.emit('error', err);
      return;
    }

    var id = res,
        task = new Task(self, id, data)
    ;

    self._client.hmset(self._prefix + id, data, function(err, res) {

      self._client.rpush(self.keys.waiting, id, cb);
    });
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

module.exports = exports = Rq;
