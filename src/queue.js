
'use strict';

var redis = require('redis')
;

function Rq(queueName, options) {

  this.host = options.host || '127.0.0.1';
  this.port = options.port || 6327;
  this.queue = queueName;
  this._client = redis.createClient(this.port, this.host);

}

module.exports = exports = Rq;
