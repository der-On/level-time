'use strict';

module.exports = {
  resources: {
    TimeEnry: {
      fields: {
        title: 'Title',
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
        start: 'Start date of consolidated time entries.',
        end: 'End date of consolidated time entries.'
      }
    }
  },
  routes: {
    'GET::/time-entries': {
      desc: 'Returns all time entries.',
      returns: 'TimeEntries'
    },
    'GET::/time-entries/:group': {
      desc: 'Returns all time entries in a group.',
      returns: 'TimeEntries'
    },
    'GET::/time-entries/:group/:id': {
      desc: 'Returns single time entry.',
      returns: 'TimeEntry'
    },
    'GET::/time-entries/consolidate': {
      desc: 'Returns consolidation of all time entries.',
      returns: 'Consolidation'
    },
    'GET::/time-entries/:group/consolidate': {
      desc: 'Returns consolidation of all time entries in a group.',
      returns: 'Consolidation'
    },
    'POST::/time-entries/:group/start': {
      desc: 'Starts new time entry in "group".',
      returns: 'TimeEntry'
    },
    'POST::/time-entries/:group/:id/stop': {
      desc: 'Stops existing time entry in "group" with id "id".',
      returns: 'TimeEntry'
    },
    'DELETE::/time-entries/:group': {
      desc: 'Removes all time entries in "group"',
      returns: 'none'
    },
    'DELETE::/time-entries/:group/:id': {
      desc: 'Removes existing time entry in "group" with id "id".',
      returns: 'none'
    }
  }
};
