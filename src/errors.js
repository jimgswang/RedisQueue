
'use strict';


exports.couldNotLock = function(taskId) {

  return new Error('Could not acquire lock for id: ' + taskId);
};




