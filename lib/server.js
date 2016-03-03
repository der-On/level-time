'use strict';

var debug = require('debug')('level-time:server');
var restify = require('restify');
var port = process.env.PORT || 8080;
var docs = require('./server_docs.js');

function createFilter(query) {
  return function (entry) {
    return true;
  };
}

module.exports = function (api) {
  var server = restify.createServer({
    name: 'Level-Time'
  });


  server.use(function (req, res, next) {
    debug('%s: %s', req.method, req.path());
    next();
  });

  server.use(restify.acceptParser(server.acceptable));
  server.use(restify.dateParser());
  server.use(restify.queryParser());
  server.use(restify.gzipResponse());
  server.use(restify.bodyParser());
  server.use(restify.CORS());

  server.get('/', function (req, res) {
    res.send(docs);
  });

  server.get('time-entries/:group/consolidate', function (req, res, next) {
    api.tracker.consolidate(req.params.group, createFilter(req.query))
      .then(function (entries) {
        res.send(entries);
        next();
      })
      .catch(next);
  });

  server.get('time-entries/consolidate', function (req, res, next) {
    api.tracker.consolidate(createFilter(req.query))
      .then(function (entries) {
        res.send(entries);
        next();
      })
      .catch(next);
  });

  server.get('time-entries/:group/running', function (req, res, next) {
    api.tracker.running(req.params.group, createFilter(req.query))
      .then(function (entries) {
        res.send(entries);
        next();
      })
      .catch(next);
  });

  server.get('time-entries/running', function (req, res, next) {
    api.tracker.running(createFilter(req.query))
      .then(function (entries) {
        res.send(entries);
        next();
      })
      .catch(next);
  });


  server.get('time-entries/:group/:id', function (req, res, next) {
    api.tracker.get(req.params.group, req.params.id)
      .then(function (entry) {
        res.send(entry);
        next();
      })
      .catch(next);
  });

  server.get('time-entries/:group', function (req, res, next) {
    api.tracker.filter(req.params.group, createFilter(req.query))
      .then(function (entries) {
        res.send(entries);
        next();
      })
      .catch(next);
  });

  server.get('time-entries', function (req, res, next) {
    api.tracker.filter(createFilter(req.query))
      .then(function (entries) {
        res.send(entries);
        next();
      })
      .catch(next);
  });

  server.post('time-entries/:group/start', function (req, res, next) {
    api.tracker.start(req.params.group, req.body)
      .then(function (entry) {
        req.send(entry);
        next();
      })
      .catch(next);
  });

  server.post('time-entries/:group/:id/stop', function (req, res, next) {
    api.tracker.stop(req.params.group, req.params.id)
      .then(function (entry) {
        req.send(entry);
        next();
      })
      .catch(next);
  });

  server.del('time-entries/:group', function (req, res, next) {
    api.tracker.remove(req.params.group)
      .then(function () {
        res.send(200);
        next();
      })
      .catch(next);
  });

  server.del('time-entries/:group/:id', function (req, res, next) {
    api.tracker.remove(req.params.group, req.params.id)
      .then(function () {
        res.send(200);
        next();
      })
      .catch(next);
  });

  server.listen(port, function () {
    debug('listening on port %d', port);
  });

  return server;
};
