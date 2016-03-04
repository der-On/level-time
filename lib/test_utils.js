'use strict';

function sleep(/*duration [, arg1, ..., argN]*/) {
  var args = Array.from(arguments);
  var duration = args.shift();
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve.apply(null, args);
    }, duration);
  });
}

module.exports = {
  sleep: sleep
};
