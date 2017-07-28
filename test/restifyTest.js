const Ajv = require('ajv');
const _ = require('lodash');
const jsf = require('json-schema-faker');

const mockConfig = require('../mockConfig')

const ajv = new Ajv({ allErrors: true, unknownFormats: 'ignore' });
ajv.addFormat('int64', '^\\d+$');

const schema = {
  'type': 'array',
  'items': {
    'type': 'object',
    'properties': {
      'length': { 'type': 'number' },
      'width': { 'type': 'number' },
    },
  },
};

const validate = ajv.compile(schema);

const valid = validate(
  [{
    length: 1,
    width: 'dsa',
    h: 'ds',
  }]);

if (valid) {
  console.log('success');
} else {
  console.log(validate.errors);
}

// const newStr = '/pet/{petId}/hello/'.replace(/{(.*?)}/g,function(match,p){
//   return `:${p}`;
// });
// console.log(newStr);
const errs = { err: null, msg: [] };

const b = ['error'];

errs.msg = _.concat(errs.msg, b);
console.log(errs);

jsf.resolve(mockConfig.okResponseSchema).then((result) => {
  console.log(JSON.stringify(result));
});