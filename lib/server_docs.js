'use strict';

module.exports = {
  ressources: {
    Timer: {
      fields: {
        title: 'Title',
        group: 'Group the time entry is in',
        start: 'start date',
        end: 'end date (if entry was stopped)',
        hourlyPrice: 'price per hour',
        '...': 'Anything you attach'
      }
    },
    Consolidation: {
      fields: {
        duration: 'Total duration of consolidated times in ms.',
        price: 'total price',
        start: 'Start date of consolidated timers.',
        end: 'End date of consolidated timers.',
        countTimers: 'number of consolidated timers'
      }
    },
    Group: {
      fields: {
        name: 'Group name',
        '...': 'Anything you attach'
      }
    }
  },
  routes: {
    'GET::/timers': {
      desc: 'Returns all timers.',
      returns: 'Timers'
    },
    'GET::/timers/running': {
      desc: 'Returns all currently running timer.',
      returns: 'Timers'
    },
    'GET::/timers/:group': {
      desc: 'Returns all timers in a group.',
      returns: 'Timers'
    },
    'GET::/timers/:group/:id': {
      desc: 'Returns single time entry.',
      returns: 'Timer'
    },
    'GET::/timers/consolidate': {
      desc: 'Returns consolidation of all timers.',
      returns: 'Consolidation'
    },
    'GET::/timers/:group/consolidate': {
      desc: 'Returns consolidation of all timers in a group.',
      returns: 'Consolidation'
    },
    'POST::/timers/:group/start': {
      desc: 'Starts new time entry in "group".',
      returns: 'Timer'
    },
    'POST::/timers/:group/:id/stop': {
      desc: 'Stops existing time entry in "group" with id "id".',
      returns: 'Timer'
    },
    'DELETE::/timers/:group': {
      desc: 'Removes all timers in "group"',
      returns: 'none'
    },
    'DELETE::/timers/:group/:id': {
      desc: 'Removes existing time entry in "group" with id "id".',
      returns: 'none'
    },
    'GET::/groups': {
      desc: 'Returns all existing groups',
      returns: 'Groups'
    },
    'GET::/groups/:name': {
      desc: 'Returns a single group with the name "name".',
      returns: 'Group'
    },
    'GET::/groups/names': {
      desc: 'Returns the names of all existing groups.',
      returns: 'List of strings'
    },
    'GET::/groups/:name/timers': {
      desc: 'Returns all timers in a group.',
      returns: 'Timers'
    },
    'GET::/groups/:name/timers/running': {
      desc: 'Returns all running timers in a group.',
      returns: 'Timers'
    },
    'POST::/groups/:name': {
      desc: 'Creates new group with the name "name"',
      returns: 'Group'
    },
    'PUT::/groups/:name': {
      desc: 'Updates an existing group',
      returns: 'Group'
    },
    'DELETE::/groups/:name': {
      desc: 'Removes a group and all of its timers.',
      returns: 'none'
    }
  }
};
