'use strict';

var utils = require('../src/utils'),
    expect = require('chai').expect,
    _ = require('lodash')
;

describe('optCallback', function() {

  it('returns no-op if passed nothing', function() {

    expect(utils.optCallback()).to.equal(_.noop);
  });

  it('returns no-op if passed non function', function() {

    expect(utils.optCallback('1')).to.equal(_.noop);
  });

  it('returns original function if passed function', function() {

    var foo = function() {};

    expect(utils.optCallback(foo)).to.equal(foo);

  });

});
