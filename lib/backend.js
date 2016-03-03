'use strict';

var path = require('path');
var debug = require('debug')('level-timer:backend');
var net = require('net');
var level = require('level');
var multilevel = require('multilevel');

module.exports = function (opts) {
  opts = opts || {};
  var backend = {};

  opts.username = process.env.BACKEND_USERNAME || null;
  opts.password = process.env.BACKEND_PASSWD || null;
  opts.port = process.env.BACKEND_PORT || 4567;
  opts.dest = process.env.BACKEND_DEST || path.join(__dirname, '..', 'db');

  function auth(user, done) {
    if (opts.username && opts.password) {
      if (user.name === opts.username && user.password === opts.password) {
        done(null, { name: user.name });
      } else {
        done(new Error('Unauthorized'));
      }
    } else {
      done(null, { name: user.name });
    }
  }

  function access(user, db, method, args) {
    if (opts.username && user.name !== opts.username) {
      throw new Error('Unauthorized');
    }
  }

  backend.db = level(opts.dest, {
    keyEncoding: 'utf8',
    valueEncoding: 'json'
  });

  backend.server = net.createServer(function (connection) {
    debug('connected to %s', connection.remoteAddress);

    connection
      .pipe(multilevel.server(backend.db, {
        auth: auth,
        access: access
      }))
      .pipe(connection);
  })
    .listen(opts.port, function () {
      debug('listening on port %d', opts.port);
    });

  return backend;
};
