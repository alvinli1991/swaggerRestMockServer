/**
 * 1、读取swagger
 */

// const restify = require('restify');
// const restifyErrors = require('restify-errors');
const $RefParser = require('json-schema-ref-parser');

const swagger = require('./testData');
const swaggerParser = require('./swaggerParser');

const mockServer = function mockSwaggerApis(config) {
  // TODO 获取swagger spec
  const swaggerSpec = swagger.swaggerSpecJSON;

  // TODO 解析出definitions的内容
  $RefParser.dereference({ definitions: swaggerSpec.definitions }).then((schema) => {
    // TODO 解析出API的内容(包括request 请求参数的验证以及response的mock数据)
    // TODO 根据解析出的内容，创建rest server
  })
    .catch((err) => {
      console.error(err);
    });
};

// TODO 读取参数配置

mockServer({});
