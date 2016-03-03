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

    while(num++ < 10) {
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

    while(num++ < 10) {
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

    while(num++ < 10) {
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

    while(num++ < 10) {
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

    while(num++ < 10) {
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

  it('should remove a single timer', function () {
    throw new Error('Create Test');
  });

  it('should remove all timers of a group', function () {
    throw new Error('Create Test');
  });

  it('should create groups', function () {
    throw new Error('Create Test');
  });

  it('should list groups', function () {
    throw new Error('Create Test');
  });

  it('should list group names', function () {
    throw new Error('Create Test');
  });
});
