# swagger spec mock server

基于swagger spec的json生成的一个mock server

>当前只是做出了一个雏形，实现基本的构想，但是细节方面并没有太多注意

目前支持：

1. 从指定的本地路径以及url上读取swagger spec json
2. 根据swagger规范，检查参数的合法性
3. 根据swagger规范，fake response的数据

执行：

1. 执行 npm install
2. 根据下面的方式，启动mock服务

```
Usage: node swaggerMock.js [options]

Options:
  --port, -p   mock server port                         [number] [default: 8080]
  --local, -l  swagger specs local file path              [string] [default: ""]
  --url, -u    swagger specs url                          [string] [default: ""]
  --test, -t   swagger test specs                                      [boolean]
  -h, --help   Show help                                               [boolean]

Examples:
  node swaggerMock.js -p 8000 -u http://petstore.swagger.io/v2/swagger.json

```