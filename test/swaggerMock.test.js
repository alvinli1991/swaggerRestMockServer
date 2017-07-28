const mockApiServer = require('../mockServer');

const config = {
  port: 8000,
  test: true,
}


console.log(JSON.stringify(config));

// 启动server
mockApiServer.mockServer(config);
