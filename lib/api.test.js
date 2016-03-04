'use strict';

var memdb = require('memdb');
var Api = require('./api');
var expect = require('expect.js');

function createDb() {
  return memdb({
    keyEncoding: 'utf8',
    valueEncoding: 'json'
  });
}

function sleep(/*duration [, arg1, ..., argN]*/) {
  var args = Array.from(arguments);
  var duration = args.shift();
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve.apply(null, args);
    }, duration);
  });
}

describe('api', function () {
  it('should initialize', function () {
    var db = createDb();
    var api = Api({ db: db });

    expect(api.db).to.an(Object);
    expect(api.db).not.to.be(null);
  });

  it('should start and stop timers', function () {
    var db = createDb();
    var api = Api({ db: db });
    var start;
    var now = new Date();

    return api.timers.start('foo', {
      title: 'bar',
      comment: 'custom'
    })
      .then(function (timer) {
        // timer is valid
        expect(timer).not.to.be(null);
        expect(timer).to.be.an(Object);

        // has valid id
        expect(timer.id).to.be.a('string');
        expect(timer.id.length).to.be.above(0);

        // has valid start date
        expect(timer.start).to.be.a(Date);
        expect(timer.start >= now).to.be(true);

        // has no end date yet
        expect(timer.end).to.be(null);

        // has correct title
        expect(timer.title).to.be('bar');

        // has our comment
        expect(timer.comment).to.be('custom');

        // store start for later comparison
        start = new Date(timer.start.getTime());

        return sleep(100, timer);
      })
      .then(function (timer) {
        return api.timers.stop('foo', timer.id);
      })
      .then(function (timer) {
        expect(timer.start).to.eql(start);

        // has valid end date
        expect(timer.end).to.be.a(Date);
        expect(timer.start < timer.end).to.be(true);
        expect(timer.end.getTime() - timer.start.getTime()).to.be.above(100);
      });
  });

  it('should update timers', function () {
    var db = createDb();
    var api = Api({ db: db });

    return api.timers.start('foo', { title: 'bar' })
      .then(function (timer) {
        return api.timers.update('foo', timer.id, { comment: 'comment', title: 'changed' });
      })
      .then(function (timer) {
        expect(timer.title).to.be('changed');
        expect(timer.comment).to.be('comment');

        return api.timers.get('foo', timer.id);
      })
      .then(function (timer) {
        expect(timer.title).to.be('changed');
        expect(timer.comment).to.be('comment');
      });
  });

  it('should list all running timers of a group', function () {
    var db = createDb();
    var api = Api({ db: db });
    var num = 0;
    var promises = [];

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    return Promise.all(promises)
      .then(function () {
        return sleep(50);
      })
      .then(function () {
        return api.timers.running('foo');
      })
      .then(function (timers) {
        expect(timers.length).to.be(10);

        function p(timer) {
          return api.timers.stop('foo', timer.id);
        }

        return Promise.all(timers.map(p));
      })
      .then(function () {
        return api.timers.running('foo');
      })
      .then(function (timers) {
        expect(timers.length).to.be(0);
      });
  });

  it('should list all running timers', function () {
    var db = createDb();
    var api = Api({ db: db });
    var num = 0;
    var promises = [];

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    return Promise.all(promises)
      .then(function () {
        return sleep(50);
      })
      .then(function () {
        return api.timers.running();
      })
      .then(function (timers) {
        expect(timers.length).to.be(10);

        function p(timer) {
          return api.timers.stop('foo', timer.id);
        }

        return Promise.all(timers.map(p));
      })
      .then(function () {
        return api.timers.running();
      })
      .then(function (timers) {
        expect(timers.length).to.be(0);
      });
  });

  it('should list all timers of a group', function () {
    var db = createDb();
    var api = Api({ db: db });
    var promises = [];
    var num = 0;

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    return Promise.all(promises)
      .then(function () {
        return api.timers.all('foo');
      })
      .then(function (timers) {
        expect(timers.length).to.be(10);
      });
  });

  it('should list all timers', function () {
    var db = createDb();
    var api = Api({ db: db });
    var promises = [];
    var num = 0;

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    return Promise.all(promises)
      .then(function () {
        return api.timers.all();
      })
      .then(function (timers) {
        expect(timers.length).to.be(10);
      });
  });

  it('should consolidate all timers of a group', function () {
    var db = createDb();
    var api = Api({ db: db });
    var num = 0;
    var promises = [];
    var now = new Date();
    var then;

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num, hourlyPrice: 10 }));
    }

    return Promise.all(promises)
      .then(function () {
        return sleep(50);
      })
      .then(function () {
        return api.timers.running('foo');
      })
      .then(function (timers) {
        function p(timer) {
          return api.timers.stop('foo', timer.id);
        }

        return Promise.all(timers.map(p));
      })
      .then(function () {
        then = new Date();
        return api.timers.consolidate('foo');
      })
      .then(function (consolidation) {
        var hourlyMulti = 1 / (1000 * 60 * 60);
        expect(consolidation.countTimers).to.be(10);
        expect(consolidation.start >= now).to.be(true);
        expect(consolidation.end).to.be.above(consolidation.start);
        expect(consolidation.end <= then).to.be(true);
        expect(consolidation.duration >= 10 * 50).to.be(true);
        expect(consolidation.price >= 10 * 50 * hourlyMulti).to.be(true);
      });
  });

  it('should load a timer', function () {
    var db = createDb();
    var api = Api({ db: db });
    var timer;

    return api.timers.start('foo', { title: 'bar' })
      .then(function (_timer) {
        timer = _timer;
        return api.timers.get('foo', timer.id);
      })
      .then(function (_timer) {
        expect(timer).to.eql(_timer);
      });
  });

  it('should load all timers of a group', function () {
    var db = createDb();
    var api = Api({ db: db });
    var timers;
    var num = 0;
    var promises = [];

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    return Promise.all(promises)
      .then(function (_timers) {
        timers = _timers.sort(sort);
        return api.timers.all('foo');
      })
      .then(function (_timers) {
        expect(_timers.length).to.be(timers.length);
        expect(_timers.sort(sort)).to.eql(timers);
      });
  });

  it('should load all timers', function () {
    var db = createDb();
    var api = Api({ db: db });
    var timers;
    var num = 0;
    var promises = [];

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    return Promise.all(promises)
      .then(function (_timers) {
        timers = _timers.sort(sort);
        return api.timers.all();
      })
      .then(function (_timers) {
        expect(_timers.length).to.be(timers.length);
        expect(_timers.sort(sort)).to.eql(timers);
      });
  });

  it('should remove a single timer', function () {
    var db = createDb();
    var api = Api({ db: db });
    var id;

    return api.timers.start('foo', { title: 'bar' })
      .then(function (timer) {
        id = timer.id;
        return api.timers.remove('foo', id);
      })
      .then(function () {
        return api.timers.get('foo', id);
      })
      .catch(function (err) {
        expect(err.toString()).to.contain('NotFoundError');

        return Promise.resolve();
      });
  });

  it('should remove all timers of a group', function () {
    var db = createDb();
    var api = Api({ db: db });
    var num = 0;
    var promises = [];

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    return Promise.all(promises)
      .then(function (timers) {
        expect(timers.length).to.be(10);

        return api.timers.remove('foo');
      })
      .then(function () {
        return api.timers.all('foo');
      })
      .then(function (timers) {
        expect(timers.length).to.be(0);
      });
  });

  it('should remove all timers', function () {
    var db = createDb();
    var api = Api({ db: db });
    var num = 0;
    var promises = [];

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    return Promise.all(promises)
      .then(function (timers) {
        expect(timers.length).to.be(10);

        return api.timers.remove();
      })
      .then(function () {
        return api.timers.all();
      })
      .then(function (timers) {
        expect(timers.length).to.be(0);
      });
  });

  it('should create groups', function () {
    var db = createDb();
    var api = Api({ db: db });
    var group;

    return api.groups.create('foo', { description: 'bar' })
      .then(function (_group) {
        group = _group;
        expect(group.name).to.be('foo');
        expect(group.description).to.be('bar');

        return api.groups.get('foo');
      })
      .then(function (_group) {
        expect(_group).to.eql(group);
      });
  });

  it('should update a group', function () {
    var db = createDb();
    var api = Api({ db: db });

    return api.groups.create('foo', { description: 'bar' })
      .then(function (group) {
        return api.groups.update('foo', { description: 'foobar', name: 'bar' });
      })
      .then(function (group) {
        expect(group.description).to.be('foobar');

        // name should not be overwritten
        expect(group.name).to.be('foo');
      });
  });

  it('should list groups', function () {
    var db = createDb();
    var api = Api({ db: db });
    var num = 0;
    var promises = [];

    while (num++ < 10) {
      promises.push(api.groups.create('group-' + num));
    }

    return Promise.all(promises)
      .then(function () {
        return api.groups.all();
      })
      .then(function (groups) {
        expect(groups.length).to.be(10);
      });
  });

  it('should list group names', function () {
    it('should list groups', function () {
      var db = createDb();
      var api = Api({ db: db });
      var num = 0;
      var names = [];
      var promises = [];

      while (num++ < 10) {
        names.push('group-' + num);
        promises.push(api.groups.create('group-' + num));
      }

      return Promise.all(promises)
        .then(function () {
          return api.groups.names();
        })
        .then(function (groups) {
          expect(groups.length).to.be(10);
          expect(groups.sort(function (a, b) {
            return a.name < b.name ? -1 : 1;
          })).to.eql(names);
        });
    });
  });

  it('should load all timers of a group', function () {
    var db = createDb();
    var api = Api({ db: db });
    var timers;
    var num = 0;
    var promises = [];

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    return Promise.all(promises)
      .then(function (_timers) {
        timers = _timers.sort(sort);
        return api.groups.timers('foo');
      })
      .then(function (_timers) {
        expect(_timers.length).to.be(timers.length);
        expect(_timers.sort(sort)).to.eql(timers);
      });
  });

  it('should load all running timers of a group', function () {
    var db = createDb();
    var api = Api({ db: db });
    var timers;
    var num = 0;
    var promises = [];

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    return Promise.all(promises)
      .then(function (_timers) {
        timers = _timers.sort(sort);
        return api.groups.runningTimers('foo');
      })
      .then(function (_timers) {
        expect(_timers.length).to.be(timers.length);
        expect(_timers.sort(sort)).to.eql(timers);
      });
  });
});
