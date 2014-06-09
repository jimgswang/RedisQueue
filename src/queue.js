
'use strict';

var redis = require('redis'),
    Task = require('./task'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    _ = require('lodash')
;

function Rq(queueName, options) {

  var self = this
  ;

  this.host = options.host || '127.0.0.1';
  this.port = options.port || 6327;
  this.queue = queueName;

  this._client = redis.createClient(this.port, this.host);
  this._prefix = 'rq:' + queueName + ':';

  EventEmitter.call(this);

  this._client.on('error', function(err) {
    self.emit('error', err);
  });

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

    self._client.hmset(self._prefix + id, data, cb);
  });

};

module.exports = exports = Rq;
