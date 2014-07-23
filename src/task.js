
'use strict';

function Task(queue, id, data) {

  this._queue = queue;
  this.id = id;
  this.data = data;
}

module.exports = Task;
