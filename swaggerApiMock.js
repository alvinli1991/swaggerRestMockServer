/**
 * 1、读取swagger
 */

// const restify = require('restify');
// const restifyErrors = require('restify-errors');
const $RefParser = require('json-schema-ref-parser');

const swagger = require('./testData');
const swaggerParser = require('./swaggerParser');

const defPromise = $RefParser.dereference({ definitions: swagger.swaggerSpecJSON.definitions });

const mockApis = function mockSwaggerApis(config, schema) {

}

defPromise.then((schema) => {
  mockApis({}, schema);
})
  .catch((err) => {
    console.error(err);
  });
