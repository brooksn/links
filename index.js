var port = process.env.PORT|| process.env.port || process.env.npm_package_config_port || 3000;

var koa = require('koa');
var mount = require('koa-mount');
var links = require('./app.js');

var app = koa();
app.use(mount(links));
app.listen(port);
