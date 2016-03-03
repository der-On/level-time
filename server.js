'use strict';

var backend = require('./lib/backend')();
var api = require('./lib/api')();
var server = require('./lib/server')(api);
