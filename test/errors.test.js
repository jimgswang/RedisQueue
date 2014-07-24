
'use strict';

var QueueErrors = require('../src/errors'),
    expect = require('chai').expect
;

describe('Errors', function() {

  describe('couldNotLock', function() {

    it('returns a new Error with taskId', function() {

      var err = QueueErrors.couldNotLock('1');

      expect(err).to.be.an.instanceof(Error);
      expect(err.message).to.have.string('1');
    });
  });

});
