
'use strict';

var redis = require('redis')
;

function Rq(queueName, options) {

  this.host = options.host || '127.0.0.1';
  this.port = options.port || 6327;
  this.queue = queueName;

  this._client = redis.createClient(this.port, this.host);
  this._prefix = 'rq:' + queueName;

}

/**
 * Add new task to the queue
 */
Rq.prototype.enqueue = function (data) {

  // get new id for task
  var id = this._client.incr(this._prefix + ":id", redis.print);
  console.log(id);




};

module.exports = exports = Rq;
