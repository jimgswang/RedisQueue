'use strict';

var _ = require('lodash')
;

exports.optCallback = function (callback) {

  if(typeof callback !== 'function') {
    return _.noop;
  }

  return callback;
};
