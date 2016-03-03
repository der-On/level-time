# level-time

RESTful Time-Tracker with leveldb backend

## Installation

```
npm install level-time
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
var levelTime = require('level-time');

// start the backend
var backend = levelTime.Backend();

// create the api
var api = levelTime.Api();

// create a RESTful server from the api
var server = levelTime.Server(api);

// API exposes these methods, all returning promises
// time entries are always stored within groups. You can choose any group name you want
api.tracker.start(group [, data]); // Starts time tracking
api.tracker.stop(group, id); // stops time tracking
api.tracker.get(group, id); // reads a single time entry
api.tracker.update(group, id data); // updates a time entry
api.tracker.remove(group, id); // removes a time entry
api.tracker.filter([group,] filter); // returns a list of time entries filtered using the 'filter' function
api.tracker.consolidate([group, ], filter); // returns consolidated time of the filtered time entries
api.tracker.running([group, ], filter); // returns all currently running timers
```

## Usage (API with own leveldb)

You can pass your own level database to the API.

Use this if you have your own leveldb server or using any leveldown/levelup compatible thing.

```javascript
var level = require('level');
var levelTime = require('level-time');

var myLevel = level('./myDB');

var api = levelTime.Api({ db: myLevel });
```

With a slight change you can use it in the browser too:

```javascript
var memdb = require('memdb');
var Api = require('level-time/lib/api');

var myDb = memdb();
var api = Api({ db: myDb });
```
