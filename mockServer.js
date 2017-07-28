const fs = require('fs');
const _ = require('lodash');
const Ajv = require('ajv');
const restify = require('restify');
const request = require('request-promise');
const restifyErrors = require('restify-errors');
const $RefParser = require('json-schema-ref-parser');
const jsf = require('json-schema-faker');
const swagger = require('./testData');
const swaggerParser = require('./swaggerParser');
const mockConfig = require('./mockConfig');


const ajv = new Ajv({ allErrors: true, unknownFormats: 'ignore' });
ajv.addFormat('int64', '^\\d+$');


/**
 * 根据参数类型来校验相关内容
 * @param req
 * @param paramInfo
 * @returns {{err: Error, msg: string}}
 */
const validateParam = function validateParameter(params, paramInfo, paramType) {
  const result = { err: new Error(), msg: '' };

  const paramName = _.get(paramInfo, 'name', null);
  let paramValue = _.get(params, paramName, null);

  if (paramInfo.required && !_.has(params, paramName)) {
    result.msg = `param ${paramName} is required`;
    return result;
  }

  if ((paramType === 'query' || paramType === 'form') && !paramInfo.allowEmptyValue && !paramValue) {
    result.msg = `param ${paramName} is not allowed empty`;
    return result;
  }

  if (paramInfo.type === 'string') {
    if (!_.isString(params[paramName])) {
      result.msg = `param ${paramName} must be string`;
      return result;
    }
    if (paramInfo.pattern) {
      const re = new RegExp(paramInfo.pattern);
      if (!re.test(paramValue)) {
        result.msg = `param ${paramName} is not match pattern ${paramInfo.pattern}`;
        return result;
      }
    }
  }

  if (paramInfo.type === 'number') {
    paramValue = _.toNumber(paramValue);
    if (!_.isNumber(paramValue)) {
      result.msg = `param ${paramName} must be number`;
      return result;
    }
  }

  if (paramInfo.type === 'integer') {
    paramValue = _.toNumber(paramValue);
    if (!_.isInteger(paramValue)) {
      result.msg = `param ${paramName} must be integer`;
      return result;
    }
  }

  if (paramInfo.type === 'boolean') {
    if (!_.isBoolean(paramValue)) {
      result.msg = `param ${paramName} must be boolean`;
      return result;
    }
  }

  // if (paramInfo.type === 'array') {
  //   if (paramInfo.collectionFormat === 'csv') {
  //     result.msg = `param ${paramName} must be array`;
  //     return result;
  //   }
  // }


  result.err = null;
  return result;
};

const validateQuery = function validateQuery(req, queries) {
  const err = { err: null, msg: [] };
  if (_.size(queries) === 0) {
    return err;
  }
  Object.keys(queries).forEach((name) => {
    const result = validateParam(req.query, queries[name], 'query');
    if (result.err) {
      err.msg.push(result.msg);
    }
  });
  if (_.size(err.msg) > 0) {
    err.err = new Error();
  }
  return err;
};

const validatePath = function validatePath(req, paths) {
  const err = { err: null, msg: [] };
  if (_.size(paths) === 0) {
    return err;
  }
  Object.keys(paths).forEach((name) => {
    const result = validateParam(req.params, paths[name], 'path');
    if (result.err) {
      err.msg.push(result.msg);
    }
  });
  if (_.size(err.msg) > 0) {
    err.err = new Error();
  }
  return err;
};

const validateHeader = function validateHeader(req, headers) {
  const err = { err: null, msg: [] };
  if (_.size(headers) === 0) {
    return err;
  }
  Object.keys(headers).forEach((name) => {
    const result = validateParam({ [name]: req.header(name, '') }, headers[name], 'header');
    if (result.err) {
      err.msg.push(result.msg);
    }
  });
  if (_.size(err.msg) > 0) {
    err.err = new Error();
  }
  return err;
};

const validateForm = function validateForm(req, forms) {
  const err = { err: null, msg: [] };
  if (_.size(forms) === 0) {
    return err;
  }
  Object.keys(forms).forEach((name) => {
    const result = validateParam(req.params, forms[name], 'form');
    if (result.err) {
      err.msg.push(result.msg);
    }
  });
  if (_.size(err.msg) > 0) {
    err.err = new Error();
  }
  return err;
};

const validateRequest = function validateRequest(req, apiInfo) {
  const errs = { err: null, msg: [] };
  if (_.includes(apiInfo.consumes, 'application/json') &&
    _.includes(['application/json', 'application/json; charset=utf-8'], req.contentType()) &&
    req.body) {
    const validate = ajv.compile(apiInfo.params.body);
    const valid = validate(req.body);
    if (!valid) {
      errs.msg.push(validate.errors);
    }
  }

  let result = validateQuery(req, apiInfo.params.queries);

  if (result.err) {
    errs.msg = _.concat(errs.msg, result.msg);
  }

  result = validatePath(req, apiInfo.params.paths);

  if (result.err) {
    errs.msg = _.concat(errs.msg, result.msg);
  }

  result = validateHeader(req, apiInfo.params.headers);
  if (result.err) {
    errs.msg = _.concat(errs.msg, result.msg);
  }

  result = validateForm(req, apiInfo.params.forms);
  if (result.err) {
    errs.msg = _.concat(errs.msg, result.msg);
  }

  if (_.size(errs.msg) > 0) {
    errs.err = new Error('validate fail');
  }
  return errs;
};

const genRestifyOperationFunc = function genRestifyOperationFunc(apiInfo, flatDefinitions) {
  return (req, res, next) => {
    // 验证request
    const requestValidate = validateRequest(req, apiInfo);
    if (requestValidate.err) {
      console.log(JSON.stringify(requestValidate.msg));
      return next(new restifyErrors.BadRequestError(JSON.stringify(requestValidate.msg)),
        false);
    }
    // 生成返回值
    if (_.get(apiInfo, 'responses.200.schema', null)) {
      jsf.resolve(_.get(apiInfo, 'responses.200.schema')).then((result) => {
        res.send(result);
        return next();
      });
    } else {
      jsf.resolve(mockConfig.okResponseSchema).then((result) => {
        res.send(result);
        return next();
      });
    }
    return next();
  };
};

/**
 * 根据指示信息，生成供restify使用的api函数信息
 * {
 *  path :'',
 *  process : function,
 *  method : ''
 * }
 * @param apiInfos
 * @param flatDefinitions
 * @returns {Array}
 */
const mockRestifyApi = function mockRestifyApiOperation(apiInfos, flatDefinitions) {
  const apis = [];
  apiInfos.forEach((info) => {
    const apiItem = {};
    apiItem.method = info.method;
    apiItem.path = info.path.replace(/{(.*?)}/g, (match, p) => `:${p}`);
    apiItem.process = genRestifyOperationFunc(info, flatDefinitions);
    apis.push(apiItem);
  });

  return apis;
};

/**
 * 根据配置从线上，本地获取swagger specs
 * @param config
 * @returns {*}
 */
const fetchSwaggerSpecs = function getSwaggerSpecs(config) {
  if (config.test) {
    return new Promise((resolve) => {
      resolve(swagger.swaggerSpecJSON);
    });
  } else if (config.swaggerPath !== '') {
    const text = fs.readFileSync(config.swaggerPath, { encoding: 'utf8' });
    if (!text) {
      return new Promise((resolve, reject) => {
        reject('swagger spec file read error!');
      });
    }

    const swaggerJson = JSON.parse(text);
    return new Promise((resolve) => {
      resolve(swaggerJson);
    });
  } else if (config.swaggerUrl !== '') {
    const options = {
      uri: config.swaggerUrl,
      json: true,
    };
    return request(options);
  }

  return new Promise((resolve, reject) => {
    reject('no swagger specified!');
  });
};

/**
 * 创建基于restify的mock server
 * @param config
 */
const mockRestifyServer = function mockRestifySwaggerServer(config) {
  fetchSwaggerSpecs(config).then((swaggerSpec) => {
    // console.log(JSON.stringify(swaggerSpec));
    // 解析出definitions的内容
    $RefParser.dereference({ definitions: swaggerSpec.definitions }).then((flatDefinitions) => {
      const apiInfos = swaggerParser.parseAPIs(swaggerSpec, flatDefinitions);
      // 解析出API的内容(包括request 请求参数的验证以及response的mock数据)
      const ops = mockRestifyApi(apiInfos, flatDefinitions);
      // 根据解析出的内容，创建rest server
      const server = restify.createServer();
      server.use(restify.plugins.bodyParser());
      server.use(restify.plugins.queryParser());
      ops.forEach((op) => {
        if (op.method === 'get') {
          server.get(op.path, op.process);
        } else if (op.method === 'post') {
          server.post(op.path, op.process);
        } else if (op.method === 'put') {
          server.put(op.path, op.process);
        } else if (op.method === 'delete') {
          server.del(op.path, op.process);
        } else if (op.method === 'head') {
          server.head(op.path, op.process);
        }
      });
      server.listen(config.port, () => {
        console.log(`${server.name} listening at ${server.url}`);
      });
    })
      .catch((err) => {
        console.error(err);
      });
  }).catch((reason) => {
    console.log(`get swagger specs fail ${reason}`);
  });
};


exports.mockServer = mockRestifyServer;
