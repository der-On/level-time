# level-timer

RESTful Time-Tracker with leveldb backend

## Installation

```
npm install level-timer
```

## Usage (Command line)

Start the API Server and Backend:

```
npm start
```

Now open `http://localhost:8080` to see the API documentation.

You can pass the following environment variables:

- `PORT`: port the REST-server should run on
- `BACKEND_PORT`: port the backend should run on
- `BACKEND_USERNAME`: username for the backend access
- `BACKEND_PASSWD`: password for the backend access
- `BACKEND_DEST`: destination directory where the backend will write data to


## Usage (Programatically)

```javascript
var timer = require('level-timer');

// start the backend
var backend = timer.Backend();

// create the api
var api = timer.Api();

// create a RESTful server from the api
var server = timer.Server(api);

// API exposes these methods, all returning promises
// time entries are always stored within groups.
// You can choose any group name you want.
api.timers.start(group [, data]); // Starts time tracking
api.timers.stop(group, id); // stops time tracking
api.timers.get(group, id); // reads a single time entry
api.timers.update(group, id, data); // updates a time entry
api.timers.remove(group, id); // removes a time entry
api.timers.find([group,] filter); // returns a list of time entries filtered using the 'filter' function
api.timers.consolidate([group, ], filter); // returns consolidated time of the filtered time entries
api.timers.running([group, ], filter); // returns all currently running timers

api.groups.create(name, data); // create new group
api.groups.update(name, data); // update existing group
api.groups.all(); // returns all existing groups
api.groups.names(); // returns names of all existing groups
api.groups.remove(name); // removes existing group and all of its timers
api.groups.timers(name); // lists all timers of a group
api.groups.runningTimers(name); // lists all running timers of a group
```

## Usage (API with own leveldb)

You can pass your own level database to the API.

Use this if you have your own leveldb server or using any leveldown/levelup compatible thing.

```javascript
var level = require('level');
var timer = require('level-timer');

var myLevel = level('./myDB');

var api = timer.Api({ db: myLevel });
```

With a slight change you can use it in the browser too:

```javascript
var memdb = require('memdb');
var Api = require('level-timer/api');

var myDb = memdb();
var api = Api({ db: myDb });
```
