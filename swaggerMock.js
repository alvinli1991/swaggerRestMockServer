#!/usr/bin/env node

const mockApiServer = require('./mockServer');

// 命令行参数配置
const argv = require('yargs')
  .option('port', {
    alias: 'p',
    default: 8080,
    describe: 'mock server port',
    type: 'number',
  })
  .option('local', {
    alias: 'l',
    default: '',
    describe: 'swagger specs local file path',
    type: 'string',
  })
  .option('url', {
    alias: 'u',
    default: '',
    describe: 'swagger specs url ',
    type: 'string',
  })
  .option('test', {
    alias: 't',
    boolean: true,
    describe: 'swagger test specs',
  })
  .usage('Usage: node swaggerMock.js [options]')
  .example('node swaggerMock.js -p 8000 -u http://petstore.swagger.io/v2/swagger.json')
  .help('h')
  .alias('h', 'help')
  .argv;

if (!argv.test && argv.local === '' && argv.url === '') {
  throw new Error('must specify the location of swagger specs');
}

const config = {
  port: argv.port,
  swaggerPath: argv.local,
  swaggerUrl: argv.url,
  test: argv.test,
}


console.log(JSON.stringify(config));

// 启动server
mockApiServer.mockServer(config);
