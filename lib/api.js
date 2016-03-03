'use strict';

var debug = require('debug')('level-time:api');
var multilevel = require('multilevel');
var uuid = require('uuid').v4;
var merge = require('lodash/merge');
var sublevel = require('sublevel');

function generateTimerId() {
  return (new Date()).getTime() + ':' + uuid();
}

function returnTrue() {
  return true;
}

function sanitizeTimer(timer) {
  if (timer.start && !(timer.start instanceof Date)) {
    timer.start = new Date(timer.start);
  }

  if (timer.end && !(timer.end instanceof Date)) {
    timer.end = new Date(timer.end);
  }

  if (typeof timer.title !== 'string') {
    timer.title = (timer.title || '').toString();
  }

  if (timer.hourlyPrice && typeof timer.hourlyPrice !== 'number') {
    timer.hourlyPrice = parseFloat(timer.hourlyPrice || 0);
  }

  return timer;
}

module.exports = function Api (opts) {
  opts = opts || {};
  opts.host = opts.host || process.env.BACKEND_HOST || '127.0.0.1';
  opts.username = opts.username || process.env.BACKEND_USERNAME || null;
  opts.password = opts.password || process.env.BACKEND_PASSWD || null;
  opts.port = opts.port || process.env.BACKEND_PORT || 4567;

  var api = {
    timers: {},
    groups: {}
  };

  var db = opts.db || multilevel.client();
  api.db = sublevel(db);

  if (!opts.db) {
    var net = require('net');
    api.connection = net.connect(opts.port, opts.host);
    api.connection
      .pipe(db.createRpcStream())
      .pipe(api.connection);
    debug('connected to backend at port %s:%d', opts.host, opts.port);
  }

  var timers = api.db.sublevel('timers');
  var groups = api.db.sublevel('groups');

  api.Timer = function (group, data) {
    data = data || {};

    if (!data.title) {
      throw new Error('Missing title');
    }

    var timer = sanitizeTimer(merge({
      id: generateTimerId(),
      group: group,
      start: new Date(),
      end: null,
      hourlyPrice: 0
    }, sanitizeTimer(data)));

    return timer;
  };

  api.Group = function (name, data) {
    if (!name) {
      throw new Error('Missing name');
    }

    return merge(data, {
      name: name
    });
  };

  api.Consolidation = function () {
    return {
      duration: 0,
      price: 0,
      start: null,
      end: null,
      countTimers: 0
    };
  };

  api.groups.create = function (name) {
    return new Promise(function (resolve, reject) {
      try {
        var group = api.Group(name);
      } catch (err) {
        return reject(err);
      }

      groups.put(name, group, function (err) {
        if (err) return reject(err);
        resolve(group);
      })
    });
  };

  api.groups.all = function () {
    return new Promise(function (resolve, reject) {
      var groups = [];

      groups
        .createReadStream()
        .on('data', function (data) {
          groups.push(data.value);
        })
        .on('error', reject)
        .on('end', function () {
          resolve(groups);
        });
    });
  };

  api.groups.names = function () {
    return new Promise(function (resolve, reject) {
      var names = [];

      groups
        .createKeyStream()
        .on('data', function (name) {
          names.push(name);
        })
        .on('error', reject)
        .on('end', function () {
          resolve(names);
        });
    });
  };

  api.groups.get = function (name) {
    return new Promise(function (resolve, reject) {
      groups.get(name, function (err, group) {
        if (err) return reject(err);
        if (!group) return reject(new Error('Not found.'));

        resolve(group);
      });
    });
  };

  api.groups.update = function (name, data) {
    return new Promise(function (resolve, reject) {
      groups.get(name)
        .then(function (group) {
          group = merge(group, data);

          groups.put(name, group, function (err) {
            if (err) return reject(err);
            resolve(group);
          });
        });
    });
  };

  api.groups.remove = function (name) {
    return new Promise(function (resolve, reject) {
      groups.del(name, function (err) {
        if (err) return reject(err);

        // remove all timers of this group
        api.timers.remove(group)
          .then(resolve)
          .catch(reject);
      });
    });
  };

  api.groups.timers = function (name) {
    return api.timers.all(name);
  };

  api.groups.runningTimers = function (name) {
    return api.timers.running(name);
  };

  api.timers.start = function (group, data) {
    return new Promise(function (resolve, reject) {
      try {
        var timer = api.Timer(group, data);
      } catch (err) {
        return reject(err);
      }

      api.groups.create(group)
        .then(function () {
          timers
            .sublevel(group)
            .put(timer.id, timer, function (err) {
              if (err) return reject(err);
              debug('started %s:%s', group, timer.id);
              resolve(timer);
            });
        })
        .catch(reject);
    });
  };

  api.timers.all = function (group) {
    return api.timers.filter(group);
  };

  api.timers.get = function (group, id) {
    return new Promise(function (resolve, reject) {
      if (!group) {
        return reject(new Error('Missing group'));
      }

      if (!id) {
        return reject(new Error('Missing id'));
      }

      timers
        .sublevel(group)
        .get(id, function (err, timer) {
          if (err) return reject(err);
          if (!timer) return reject(new Error('Not found'));
          timer = sanitizeTimer(timer);
          resolve(timer);
        });
    });
  }

  api.timers.stop = function (group, id) {
    return new Promise(function (resolve, reject) {
      if (!group) {
        return reject(new Error('Missing group'));
      }

      if (!id) {
        return reject(new Error('Missing id'));
      }

      api.timers.update(group, id, { end: new Date() })
        .then(function (timer) {
          debug('stopped %s:%s', group, id);
          resolve(timer);
        })
        .catch(reject);
    });
  };

  api.timers.update = function (group, id, data) {
    return new Promise(function (resolve, reject) {
      if (!group) {
        return reject(new Error('Missing group'));
      }

      if (!id) {
        return reject(new Error('Missing id'));
      }

      api.timers.get(group, id)
        .then(function (timer) {
          timer = merge(sanitizeTimer(timer), sanitizeTimer(data));

          timers
            .sublevel(group)
            .put(id, timer, function (err) {
              if (err) return reject(err);
              debug('updated %s:%s', group, id);
              return resolve(timer);
            });
        });
    });
  };

  api.timers.remove = function (group, id) {
    return new Promise(function (resolve, reject) {
      if (!group) {
        return reject(new Error('Missing group'));
      }

      var promises = [];

      if (!id) {
        timers
          .sublevel(group)
          .createKeyStream()
          .on('data', function (id) {
            promises.push(api.timers.remove(group, id));
          })
          .on('error', reject)
          .on('end', function () {
            Promise.all(promises)
              .then(resolve)
              .catch(reject);
          });
      } else {
        timers
          .sublevel(group)
          .del(id, function (err) {
            if (err) return reject(err);
            debug('removed %s:%s', group, id);
            resolve(null);
          });
      }
    });
  };

  api.timers.filter = function (/*[group, filter]*/) {
    var args = Array.from(arguments);
    var group, filter;

    if (args.length === 2) {
      group = args.shift();
      filter = args.shift();
    } else if (args.length == 1) {
      if (typeof args[0] === 'function') {
        filter = args.shift();
      } else {
        group = args.shift();
        filter = returnTrue;
      }
    }

    if (typeof filter !== 'function') {
      filter = returnTrue;
    }

    return new Promise(function (resolve, reject) {
      var entries = [];

      if (group) {
        timers
          .sublevel(group)
          .createReadStream()
          .on('data', function (data) {
            var timer = sanitizeTimer(data.value);
            if (filter(timer)) entries.push(timer);
          })
          .on('error', reject)
          .on('end', function () {
            resolve(entries);
          });
      } else {
        api.groups.names()
          .then(function (groups) {
            function p(group) {
              return api.timers.filter(group, filter);
            }

            return Promise.all(groups.map(p));
          })
          .then(function (data) {
            function add(_entries) {
              entries = entries.concat(_entries);
            }

            data.forEach(add);
            resolve(entries);
          })
          .catch(reject);
      }
    });
  };

  api.timers.consolidate = function (/*[group, filter]*/) {
    var args = Array.from(arguments);
    var group, filter;

    if (args.length === 2) {
      group = args.shift();
      filter = args.shift();
    } else if (args.length == 1) {
      if (typeof args[0] === 'function') {
        filter = args.shift();
      } else {
        group = args.shift();
        filter = returnTrue;
      }
    }

    return new Promise(function (resolve, reject) {
      var consolidation = api.Consolidation();

      if (group) {
        timers = timers.sublevel(group);
      }

      var hourMulti = 1 / (1000 * 60 * 60);

      timers
        .createReadStream()
        .on('data', function (data) {
          var timer = sanitizeTimer(data.value);

          if (timer.end && filter(timer)) {
            var duration = timer.end.getTime() - timer.start.getTime();
            consolidation.countTimers++;
            consolidation.duration += duration;
            consolidation.price += (timer.hourlyPrice || 0) * duration * hourMulti;

            if (!consolidation.start || consolidation.start > timer.start) {
              consolidation.start = timer.start;
            }

            if (!consolidation.end || consolidation.end < timer.end) {
              consolidation.end = timer.end;
            }
          }
        })
        .on('error', reject)
        .on('end', function () {
          resolve(consolidation);
        });
    });
  };

  api.timers.running = function (/*[group, filter]*/) {
    var args = Array.from(arguments);
    var group, filter;

    if (args.length === 2) {
      group = args.shift();
      args.shift();
    } else if (args.length === 1) {
      if (typeof args[0] === 'function') {
        filter = args.shift();
      } else {
        group = args.shift();
        filter = returnTrue;
      }
    }

    if (typeof filter !== 'function') {
      filter = returnTrue;
    }

    function _filter(timer) {
      return !timer.end ? filter(timer) : false;
    }

    return group ?
      api.timers.filter(group, _filter)
    : api.timers.filter(_filter);
  };

  return api;
};
