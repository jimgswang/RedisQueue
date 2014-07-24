
'use strict';

var utils = require('./utils');

function Task(queue, id, data) {

  this._queue = queue;
  this.id = id;
  this.data = data;
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

  queue.unlock(self.id);

  queue._nbclient.multi()
    .lpush(result, self.id)
    .lrem(queue.keys.working, 0, self.id)
    .exec(function (err, res) {
      queue.dequeue(queue._handler);
      cb(err, res);
    });
};

module.exports = Task;
