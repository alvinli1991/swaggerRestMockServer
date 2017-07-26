/**
 * 从swagger spec 中解析出API请求描述，包含request，response的描述
 * TODO
 * 1、ref的获取和都需要被解析成真实的内容
 * 2、items的获取和解析
 */

const _ = require('lodash');

const paramObjTpl = {
  name: '',
  required: false,
  schema: null,
  type: '',
  format: '',
  allowEmptyValue: false,
  items: {},
  collectionFormat: '',
  default: null,
  maximum: null,
  exclusiveMaximum: false,
  minimum: null,
  exclusiveMinimum: false,
  maxLength: null,
  minLength: null,
  pattern: null,
  maxItems: null,
  minItems: null,
  uniqueItems: false,
  enum: [],
  multipleOf: null, //暂时忽略
};

const responseObjTpl = {
  schema: null, // 是个json schema
  headers: [],
  example: {},
};


const APIObjTpl = {
  path: '',
  method: '',
  params: {
    queries: [],
    paths: [],
    headers: [],
    forms: [],
    body: {}, // 是个json schema
  },
  responses: {},
};

/**
 * 提取不在body中的参数信息
 * @param param
 * @returns {{}}
 */
const paramsExceptBodyParser = function paramsParserExceptBody(param) {
  const partialParam = {};
  partialParam.type = param.type;
  partialParam.format = _.get(param, 'format', null);
  partialParam.allowEmptyValue = _.get(param, 'allowEmptyValue', false);
  if (param.type === 'array') {
    partialParam.items = _.get(param, 'items', null);
    partialParam.maxItems = _.get(param, 'maxItems', 10);
    partialParam.minItems = _.get(param, 'minItems', 0);
    partialParam.uniqueItems = _.get(param, 'uniqueItems', false);
    partialParam.collectionFormat = _.get(param, 'collectionFormat', 'csv');
  }
  if (param.type === 'number' || param.type === 'integer') {
    partialParam.maximum = _.get(param, 'maximum', null);
    partialParam.exclusiveMaximum = _.get(param, 'exclusiveMaximum', false);
    partialParam.minimum = _.get(param, 'minimum', null);
    partialParam.exclusiveMinimum = _.get(param, 'exclusiveMinimum', false);
    partialParam.maxLength = _.get(param, 'maxLength', null);
    partialParam.minLength = _.get(param, 'minLength', null);
    partialParam.pattern = _.get(param, 'pattern', null);
    partialParam.enum = _.get(param, 'enum', null);
  }
  return partialParam;
};

/**
 * 从swagger全局的definitions中解析出$ref
 * @param $ref
 * @param swaggerSpec
 */
const parseRef = function parseRef($ref, swaggerSpec) {
  return { in: 'formData', type: 'string' };
};

/**
 * 解析每一个http的请求规范，生成一个API
 * {
    "path":"",
    "method":"",
    "params":{
        "queries":[],
        "paths":[],
        "headers":[],
        "forms":[],
        "body":{}
    },
    "responses":{}
}
 * @param path
 * @param method
 * @param methodObj
 * @param swaggerSpec
 * @returns {}
 */
const operationParser = function parserHttpMethod(path, method, methodObj, swaggerSpec) {
  const apiObj = _.cloneDeep(APIObjTpl);
  apiObj.path = path;
  apiObj.method = method;

  // 解析请求参数
  methodObj.parameters.forEach((param) => {
    // 不考虑parameter中是ref的情况
    const realParam = param;
    const paramIn = realParam.in;
    let paramObj = _.cloneDeep(paramObjTpl);
    paramObj.name = realParam.name;
    paramObj.required = _.get(realParam, 'required', false);

    if (paramIn === 'body') {
      // TODO 解析schema
      apiObj.params.body = realParam.schema;
    } else if (paramIn === 'header') {
      paramObj = _.assign({}, paramObj, paramsExceptBodyParser(realParam));
      apiObj.params.headers.push(paramObj);
    } else if (paramIn === 'path') {
      paramObj = _.assign({}, paramObj, paramsExceptBodyParser(realParam));
      apiObj.params.paths.push(paramObj);
    } else if (paramIn === 'formData') {
      paramObj = _.assign({}, paramObj, paramsExceptBodyParser(realParam));
      apiObj.params.forms.push(paramObj);
    } else if (paramIn === 'query') {
      paramObj = _.assign({}, paramObj, paramsExceptBodyParser(realParam));
      apiObj.params.queries.push(paramObj);
    }
  });

  // 解析响应 headers和example暂时不参考
  /**
   * {"200":{}}
   */
  Object.keys(methodObj.responses).forEach((httpStatus) => {
    const swaggerResp = methodObj.responses[httpStatus];
    const respObj = _.cloneDeep(responseObjTpl);
    respObj.statusCode = httpStatus;
    // TODO 解析ref,schema
    if (_.has(swaggerResp, 'schema')) {
      respObj.schema = swaggerResp.schema;
    } else {
      respObj.schema = swaggerResp.$ref;
    }

    respObj.schema = _.get(swaggerResp, 'schema', null);
    apiObj.responses[httpStatus] = respObj;
  });
  return apiObj;
};

/**
 * 根据swagger spec提取出输入，输出信息，供构建模拟请求
 * 输入：
 *     1、输入参数
 *     2、各参数的限制
 * 输出：
 *     1、对应输出的schema
 * [{
    "path":"",
    "method":"",
    "params":{
        "queries":[],
        "paths":[],
        "headers":[],
        "forms":[],
        "body":{}
    },
    "responses":{}
},]
 * @param paths
 * @param definitions
 * @returns [{}]
 */
const restApiParser = function parseAPIs(swaggerSpec) {
  const paths = swaggerSpec.paths;
  const APIs = [];
  // 解析paths item
  Object.keys(paths).forEach((path) => {
    const pathObj = paths[path];
    // 解析path item
    Object.keys(pathObj).forEach((method) => {
      APIs.push(operationParser(path, method, pathObj[method], swaggerSpec));
    });
  });
  return APIs;
};


exports.parseAPIs = restApiParser;
