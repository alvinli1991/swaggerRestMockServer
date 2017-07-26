const refUtil = require('../refUtil');
require('should');
const $RefParser = require('json-schema-ref-parser');
const swaggerSpec = require('../testData');
const apiUtil = require('../apiInfoUtil')


describe('test get ref json path', () => {
  it('test #/definitions/Category => definitions.Category', () => {
    refUtil.getRefPath('#/definitions/Category').should.equal('definitions.Category');
  });
});




$RefParser.dereference({ definitions: swaggerSpec.swaggerSpecJSON.definitions })
  .then((schema) => {
    console.log(JSON.stringify(schema));
  });




