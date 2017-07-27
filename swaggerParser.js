/**
 * 从swagger spec 中解析出API请求描述，包含request，response的描述
 * TODO
 * 1、ref的获取和都需要被解析成真实的内容
 * 2、items的获取和解析
 */

const _ = require('lodash');
const refUtil = require('./refUtil');

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
  consumes: [],
  produces: [],
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
 * 将schema解析为去除掉$ref的模式
 * @param schemaObj
 * @param flatDefinitions 去掉$ref的definition
 */
const derefSchema = function dereferenceSchema(schemaObj, flatDefinitions) {
  if (schemaObj == null) {
    return null;
  }
  let flatSchemaObj = _.cloneDeep(schemaObj);
  if (!_.has(flatSchemaObj, 'type')) {
    flatSchemaObj.type = 'object';
  }

  if (flatSchemaObj.type === 'object') {
    if (_.has(flatSchemaObj, '$ref')) {
      const refPath = refUtil.getRefPath(flatSchemaObj.$ref);
      if (!_.has(flatDefinitions, refPath)) {
        throw new Error(`${refPath} doesn't exist in definitions`);
      }
      _.assign(flatSchemaObj, _.get(flatDefinitions, refPath));
      flatSchemaObj = _.omit(flatSchemaObj, ['$ref']);
    }
  } else if (flatSchemaObj.type === 'array') {
    if (_.has(flatSchemaObj, 'items.$ref')) {
      const refPath = refUtil.getRefPath(flatSchemaObj.items.$ref);
      if (!_.has(flatDefinitions, refPath)) {
        throw new Error(`${refPath} doesn't exist in definitions`);
      }
      _.assign(flatSchemaObj, { items: _.get(flatDefinitions, refPath) });
    }
  }
  return flatSchemaObj;
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
const operationParser = function parserHttpMethod(path, method, methodObj, flatDefinitions) {
  const apiObj = _.cloneDeep(APIObjTpl);
  apiObj.path = path;
  apiObj.method = method;
  apiObj.consumes = _.get(methodObj, 'consumes', []);
  apiObj.produces = _.get(methodObj, 'produces', []);

  // 解析请求参数
  if (_.has(methodObj, 'parameters')) {
    methodObj.parameters.forEach((param) => {
      // 不考虑parameter中是ref的情况
      const realParam = param;
      const paramIn = realParam.in;
      let paramObj = _.cloneDeep(paramObjTpl);
      paramObj.name = realParam.name;
      paramObj.required = _.get(realParam, 'required', false);

      if (paramIn === 'body') {
        apiObj.params.body = derefSchema(realParam.schema, flatDefinitions);
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
  }

  // 解析响应 headers和example暂时不参考
  /**
   * {"200":{}}
   */
  if (_.has(methodObj, 'responses')) {
    Object.keys(methodObj.responses).forEach((httpStatus) => {
      const swaggerResp = methodObj.responses[httpStatus];
      const respObj = _.cloneDeep(responseObjTpl);
      respObj.statusCode = httpStatus;
      respObj.schema = derefSchema(_.get(swaggerResp, 'schema', null), flatDefinitions);
      apiObj.responses[httpStatus] = respObj;
    });
  }

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
 * @param flatDefinitions 已经被去除$ref的definitions
 * @returns [{}]
 */
const restApiParser = function parseAPIs(swaggerSpec, flatDefinitions) {
  const paths = swaggerSpec.paths;
  const APIs = [];
  // 解析paths item
  Object.keys(paths).forEach((path) => {
    const pathObj = paths[path];
    // 解析path item
    Object.keys(pathObj).forEach((method) => {
      APIs.push(operationParser(path, method, pathObj[method], flatDefinitions));
    });
  });
  return APIs;
};


exports.parseAPIs = restApiParser;
