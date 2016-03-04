'use strict';

var debug = require('debug')('level-timer:server');
var restify = require('restify');
var port = process.env.PORT || 8080;
var docs = require('./server_docs.js');
var startsWith = require('lodash/startsWith');
var endsWith = require('lodash/endsWith');

function indexOfUnstrict(list, value) {
  var i = -1;

  while (i++ < list.length) {
    if (list[i] == value) return i;
  }

  return -1;
}

var queryPredicates = {
  _gt: function (v, q) { return v > q; },
  _gteq: function (v, q) { return v >= q; },
  _lt: function (v, q) { return v < q; },
  _lteq: function (v, q) { return v <= q; },
  _eq: function (v, q) { return v == q; },
  _not: function (v, q) { return v != q; },
  _like: function (v, q) { return v.indexOf(q) !== -1; },
  _not_like: function (v, q) { return v.indexOf(q) === -1; },
  _in: function (v, q) { return indexOfUnstrict(q.split(','), v) !== -1; },
  _not_in: function (v, q) { return indexOfUnstrict(q.split(','), v) === -1; },
  _start: startsWith,
  _end: endsWith
};

var specialQueryValues = {
  'null': null,
  'true': true,
  'false': false
};

function createFilter(query) {
  var predicates = Object.keys(queryPredicates);

  return function (timer) {
    var keys = Object.keys(query);
    var i = -1;

    function compare(key) {
      var i = -1;
      var predicate;

      while(i++ < predicates.length) {
        predicate = predicates[i];

        if (endsWith(key, predicate)) {
          return queryPredicates[predicate](
            timer[key.substring(0, -predicate.length)] || null,
            query[key]
          );
        }
      }

      return timer[key] == query[key];
    }

    while (i++ < keys.length) {
      if (!compare(keys)) {
        return false;
      }
    }

    return true;
  };
}

module.exports = function (api) {
  var server = restify.createServer({
    name: 'Level-Timer'
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

  server.get('timers/:group/consolidate', function (req, res, next) {
    api.timers.consolidate(req.params.group, createFilter(req.query))
      .then(function (consolidation) {
        res.send(consolidation);
        next();
      })
      .catch(next);
  });

  server.get('timers/consolidate', function (req, res, next) {
    api.timers.consolidate(createFilter(req.query))
      .then(function (consolidation) {
        res.send(consolidation);
        next();
      })
      .catch(next);
  });

  server.get('timers/:group/running', function (req, res, next) {
    api.timers.running(req.params.group, createFilter(req.query))
      .then(function (entries) {
        res.send(entries);
        next();
      })
      .catch(next);
  });

  server.get('timers/running', function (req, res, next) {
    api.timers.running(createFilter(req.query))
      .then(function (entries) {
        res.send(entries);
        next();
      })
      .catch(next);
  });


  server.get('timers/:group/:id', function (req, res, next) {
    api.timers.get(req.params.group, req.params.id)
      .then(function (timer) {
        res.send(timer);
        next();
      })
      .catch(next);
  });

  server.get('timers/:group', function (req, res, next) {
    api.timers.find(req.params.group, createFilter(req.query))
      .then(function (entries) {
        res.send(entries);
        next();
      })
      .catch(next);
  });

  server.get('timers', function (req, res, next) {
    api.timers.find(createFilter(req.query))
      .then(function (entries) {
        res.send(entries);
        next();
      })
      .catch(next);
  });

  server.post('timers/:group', function (req, res, next) {
    api.timers.create(req.params.group, req.body)
      .then(function (timer) {
        res.send(timer);
        next();
      })
      .catch(next);
  });

  server.post('timers/:group/start', function (req, res, next) {
    api.timers.start(req.params.group, req.body)
      .then(function (timer) {
        res.send(timer);
        next();
      })
      .catch(next);
  });

  server.post('timers/:group/:id/stop', function (req, res, next) {
    api.timers.stop(req.params.group, req.params.id)
      .then(function (timer) {
        res.send(timer);
        next();
      })
      .catch(next);
  });

  server.put('timers/:group/:id', function (req, res, next) {
    api.timers.update(req.params.group, req.params.id, req.body)
      .then(function (timer) {
        res.send(timer);
        next();
      })
      .catch(next);
  });

  server.del('timers/:group', function (req, res, next) {
    api.timers.remove(req.params.group)
      .then(function () {
        res.send(200);
        next();
      })
      .catch(next);
  });

  server.del('timers/:group/:id', function (req, res, next) {
    api.timers.remove(req.params.group, req.params.id)
      .then(function () {
        res.send(200);
        next();
      })
      .catch(next);
  });

  server.get('groups/names', function (req, res, next) {
    api.groups.names()
      .then(function (groups) {
        res.send(groups);
        next();
      })
      .catch(next);
  });

  server.get('groups/:name', function (req, res, next) {
    api.groups.get(req.params.name)
      .then(function (group) {
        res.send(group);
        next();
      })
      .catch(next);
  });

  server.get('groups', function (req, res, next) {
    api.groups.all()
      .then(function (groups) {
        res.send(groups);
        next();
      })
      .catch(next);
  });

  server.get('groups/:name/timers', function (req, res, next) {
    api.groups.timers(req.params.name)
      .then(function (timers) {
        res.send(timers);
        next();
      })
      .catch(next);
  });

  server.get('groups/:name/timers/running', function (req, res, next) {
    api.groups.runningTimers(req.params.name)
      .then(function (timers) {
        res.send(timers);
        next();
      })
      .catch(next);
  });

  server.post('groups/:name', function (req, res, next) {
    api.groups.create(req.params.name, req.body)
      .then(function (group) {
        res.send(group);
        next();
      })
      .catch(next);
  });

  server.put('groups/:name', function (req, res, next) {
    api.groups.update(req.params.name, req.body)
      .then(function (group) {
        res.send(group);
        next();
      })
      .catch(next);
  });

  server.del('groups/:name', function (req, res, next) {
    api.groups.remove(req.params.name)
      .then(function () {
        res.send(200);
        next();
      })
      .catch(next);
  });

  server.start = function (port) {
    server.listen(port, function () {
      debug('listening on port %d', port);
    });
  };

  return server;
};
