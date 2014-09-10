'use strict';

var utils = require('./utils');

function Task(queue, id, data, attempts) {

  this._queue = queue;
  this.id = id;
  this.data = data;
  this.attempts = attempts || 0;
}

/**
 * The callback to run when a task is complete
 * @param {Object} [err] - Any error that occured while processing task
 * @param {Function} [callback] - A callback to run after saving finished task
 */
Task.prototype.done = function(err, callback) {

  if(typeof err === 'function' && !callback) {
    callback = err;
    err = null;
  }

  var cb = utils.optCallback(callback),
      self = this,
      queue = this._queue,
      result = err ? queue.keys.failed
                   : queue.keys.completed
  ;

  if(err) {
    queue.emit('fail', err, self);

    if(self.attempts < queue._retries) {
      self.attempts++;
      queue._handler(self);
      return;
    }
  }

  queue.unlock(self.id);
  queue._nbclient.multi()
    .lpush(result, self.id)
    .lrem(queue.keys.working, 0, self.id)
    .exec(function (err, res) {
      queue.dequeue(queue._handler);

      if(!err && result === queue.keys.completed) {
        queue.emit('complete', self);
      }

      cb(err, res);
    });
};

module.exports = Task;
