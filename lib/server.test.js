'use strict';

var memdb = require('memdb');
var Api = require('./api');
var Server = require('./server');
var expect = require('expect.js');
var supertest = require('supertest');
var sleep = require('./test_utils').sleep;

function createDb() {
  return memdb({
    keyEncoding: 'utf8',
    valueEncoding: 'json'
  });
}

function createApi() {
  return Api({db: createDb() });
}

function createServer() {
  return Server(createApi());
}

describe('server', function () {
  it('should deliver build in docs', function (done) {
    var server = createServer();

    supertest(server)
      .get('/')
      .expect(JSON.stringify(require('./server_docs.js')))
      .end(done);
  });

  it('should start timers', function (done) {
    var server = createServer();

    supertest(server)
      .post('/timers/foo/start')
      .send({ title: 'bar' })
      .end(function (err, res) {
        if (err) return done(err);

        expect(res.body).to.be.an(Object);
        expect(res.body.id).not.to.be.empty();
        expect(res.body.title).to.be('bar');
        expect(res.body.start).not.to.be.empty();
        expect(res.body.end).to.be(null);
        expect(res.body.group).to.be('foo');
        done();
      });
  });

  it('should stop timers', function (done) {
    var server = createServer();

    supertest(server)
      .post('/timers/foo/start')
      .send({ title: 'bar' })
      .end(function (err, res) {
        if (err) return done(err);

        var id = res.body.id;

        supertest(server)
          .post('/timers/foo/' + id + '/stop')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.id).to.be(id);
            expect(res.body.end).not.to.be(null);
            done();
          });
      });
  });

  it('should load timers of a group', function (done) {
    var api = createApi();
    var server = Server(api);
    var num = 0;
    var promises = [];
    var timers;

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    Promise.all(promises)
      .then(function (_timers) {
        timers = _timers;

        supertest(server)
          .get('/timers/foo')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.length).to.be(timers.length);
            expect(JSON.stringify(res.body.sort(sort))).to.eql(JSON.stringify(timers.sort(sort)));
            done();
          });
      });
  });

  it('should load running timers of a group', function (done) {
    var api = createApi();
    var server = Server(api);
    var num = 0;
    var promises = [];
    var timers;

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    Promise.all(promises)
      .then(function (_timers) {
        timers = _timers;

        supertest(server)
          .get('/timers/foo/running')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.length).to.be(timers.length);
            expect(JSON.stringify(res.body.sort(sort))).to.eql(JSON.stringify(timers.sort(sort)));
            done();
          });
      });
  });

  it('should load all timers', function (done) {
    var api = createApi();
    var server = Server(api);
    var num = 0;
    var promises = [];
    var timers;

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    Promise.all(promises)
      .then(function (_timers) {
        timers = _timers;

        supertest(server)
          .get('/timers')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.length).to.be(timers.length);
            expect(JSON.stringify(res.body.sort(sort))).to.eql(JSON.stringify(timers.sort(sort)));
            done();
          });
      });
  });

  it('should load all running timers', function (done) {
    var api = createApi();
    var server = Server(api);
    var num = 0;
    var promises = [];
    var timers;

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    Promise.all(promises)
      .then(function (_timers) {
        timers = _timers;

        supertest(server)
          .get('/timers/running')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.length).to.be(timers.length);
            expect(JSON.stringify(res.body.sort(sort))).to.eql(JSON.stringify(timers.sort(sort)));
            done();
          });
      });
  });

  it('should load a single timer', function (done) {
    var api = createApi();
    var server = Server(api);

    api.timers.start('foo', { title: 'bar' })
      .then(function (timer) {
        supertest(server)
          .get('/timers/foo/' + timer.id)
          .end(function (err, res) {
            if (err) return done(err);

            expect(JSON.stringify(res.body)).to.eql(JSON.stringify(timer));
            done();
          });
      });
  });

  it('should update a timer', function (done) {
    var api = createApi();
    var server = Server(api);

    api.timers.start('foo', { title: 'bar' })
      .then(function (timer) {
        supertest(server)
          .put('/timers/foo/' + timer.id)
          .send({ title: 'foobar', comment: 'custom' })
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.id).to.be(timer.id);
            expect(res.body.title).to.be('foobar');
            expect(res.body.comment).to.be('custom');

            supertest(server)
              .get('/timers/foo/' + timer.id)
              .end(function (err, res) {
                if (err) return done(err);

                expect(res.body.id).to.be(timer.id);
                expect(res.body.title).to.be('foobar');
                expect(res.body.comment).to.be('custom');
                done();
              });
          });
      });
  });

  it('should consolidate timers of a group', function (done) {
    var api = createApi();
    var server = Server(api);
    var num = 0;
    var promises = [];

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num, hourlyPrice: 10 }));
    }

    Promise.all(promises)
      .then(function (timers) {
        return sleep(50, timers);
      })
      .then(function (timers) {
        function p(timer) {
          return api.timers.stop('foo', timer.id);
        }

        return Promise.all(timers.map(p));
      })
      .then(function (timers) {
        supertest(server)
          .get('/timers/foo/consolidate')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.duration >= 10 * 50).to.be(true);
            expect(res.body.price).to.be.greaterThan(0);
            expect(res.body.start).not.to.be.empty();
            expect(res.body.end).not.to.be.empty();
            expect(res.body.countTimers).to.be(10);
            done();
          });
      });
  });

  it('should consolidate all timers', function (done) {
    var api = createApi();
    var server = Server(api);
    var num = 0;
    var promises = [];

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num, hourlyPrice: 10 }));
    }

    Promise.all(promises)
      .then(function (timers) {
        return sleep(50, timers);
      })
      .then(function (timers) {
        function p(timer) {
          return api.timers.stop('foo', timer.id);
        }

        return Promise.all(timers.map(p));
      })
      .then(function (timers) {
        supertest(server)
          .get('/timers/consolidate')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.duration >= 10 * 50).to.be(true);
            expect(res.body.price).to.be.greaterThan(0);
            expect(res.body.start).not.to.be.empty();
            expect(res.body.end).not.to.be.empty();
            expect(res.body.countTimers).to.be(10);
            done();
          });
      });
  });

  it('should create a group', function (done) {
    var api = createApi();
    var server = Server(api);

    supertest(server)
      .post('/groups/foo')
      .send({ description: 'bar' })
      .end(function (err, res) {
        if (err) return done(err);

        expect(res.body).to.eql({
          name: 'foo',
          description: 'bar'
        });

        api.groups.get('foo')
          .then(function (group) {
            expect(group).to.eql({
              name: 'foo',
              description: 'bar'
            });
            done();
          });
      });
  });

  it('should load a group', function (done) {
    var api = createApi();
    var server = Server(api);

    api.groups.create('foo', { description: 'bar' })
      .then(function (group) {
        supertest(server)
          .get('/groups/foo')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body).to.eql({
              name: 'foo',
              description: 'bar'
            });
            done();
          });
      });
  });

  it('should load all groups', function (done) {
    var api = createApi();
    var server = Server(api);
    var num = 0;
    var promises = [];

    function sort(a, b) {
      return a.name < b.name ? -1 : 1;
    }

    while (num++ < 10) {
      promises.push(api.groups.create('group-' + num));
    }

    Promise.all(promises)
      .then(function (groups) {
        supertest(server)
          .get('/groups')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.length).to.be(groups.length);
            expect(res.body.sort(sort)).to.eql(groups.sort(sort));
            done();
          });
      });
  });

  it('should load group names', function (done) {
    var api = createApi();
    var server = Server(api);
    var num = 0;
    var names = [];
    var promises = [];

    function sort(a, b) {
      return a < b ? -1 : 1;
    }

    while (num++ < 10) {
      names.push('group-' + num);
      promises.push(api.groups.create('group-' + num));
    }

    Promise.all(promises)
      .then(function (groups) {
        supertest(server)
          .get('/groups/names')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.length).to.be(names.length);
            expect(res.body.sort(sort)).to.eql(names.sort(sort));
            done();
          });
      });
  });

  it('should load all timers of a group', function (done) {
    var api = createApi();
    var server = Server(api);
    var num = 0;
    var promises = [];
    var timers;

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    Promise.all(promises)
      .then(function (_timers) {
        timers = _timers;

        supertest(server)
          .get('/groups/foo/timers')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.length).to.be(timers.length);
            expect(JSON.stringify(res.body.sort(sort))).to.eql(JSON.stringify(timers.sort(sort)));
            done();
          });
      });
  });

  it('should load all running timers of a group', function (done) {
    var api = createApi();
    var server = Server(api);
    var num = 0;
    var promises = [];
    var timers;

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    Promise.all(promises)
      .then(function (_timers) {
        timers = _timers;

        supertest(server)
          .get('/groups/foo/timers/running')
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body.length).to.be(timers.length);
            expect(JSON.stringify(res.body.sort(sort))).to.eql(JSON.stringify(timers.sort(sort)));
            done();
          });
      });
  });

  it('should delete a group and all its timers', function (done) {
    var api = createApi();
    var server = Server(api);
    var num = 0;
    var promises = [];
    var timers;

    function sort(a, b) {
      return a.id < b.id ? -1 : 1;
    }

    while (num++ < 10) {
      promises.push(api.timers.start('foo', { title: 'timer ' + num }));
    }

    Promise.all(promises)
      .then(function (_timers) {
        timers = _timers;

        supertest(server)
          .del('/groups/foo')
          .end(function (err, res) {
            if (err) return done(err);

            api.groups.get('foo')
              .then(done)
              .catch(function (err) {
                expect(err.toString()).to.contain('NotFoundError');
                return api.timers.all();
              })
              .then(function (timers) {
                expect(timers.length).to.be(0);
                done();
              })
              .catch(done);
          });
      });
  });
});
