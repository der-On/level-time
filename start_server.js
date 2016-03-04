'use strict';

var port = process.env.PORT || 8080;
var backend = require('./lib/backend')();
var api = require('./lib/api')();
var server = require('./lib/server')(api);
server.start(port);
