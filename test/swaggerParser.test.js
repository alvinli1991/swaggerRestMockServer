const swaggerParser = require('../swaggerParser');
const swagger = require('../testData');
const $RefParser = require('json-schema-ref-parser');


$RefParser.dereference({ definitions: swagger.swaggerSpecJSON.definitions }).then((schema) => {
  const apis = swaggerParser.parseAPIs(swagger.swaggerSpecJSON, schema);
  console.log(JSON.stringify(apis));
})
  .catch((err) => {
    console.error(err);
  });
