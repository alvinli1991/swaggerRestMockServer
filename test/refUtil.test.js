const refUtil = require('../refUtil');
require('should');


describe('test get ref json path', () => {
  it('test #/definitions/Category => definitions.Category', () => {
    refUtil.getRefPath('#/definitions/Category').should.equal('definitions.Category');
  });
});
