'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

process.env.NODE_DEVEBOT_PROFILE = process.env.NODE_DEVEBOT_PROFILE || 'testbdd';
process.env.NODE_DEVEBOT_SANDBOX = process.env.NODE_DEVEBOT_SANDBOX || 'test';

var events = require('events');
var util = require('util');

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var superagent = require('superagent');

var debug = Devebot.require('debug');
var debuglog = debug('appWebproxy:test:bdd:world');


var app = require('../../../app/index.js');

var World;

events.EventEmitter.defaultMaxListeners = 100;

World = function World(callback) {
  this.app = app;

  var configsandbox = this.app.config.sandbox.context[process.env.NODE_DEVEBOT_SANDBOX];

  var app_conf = configsandbox.application;
  debuglog.isEnabled && debuglog(' - Application Config: %s', JSON.stringify(app_conf));

  this.superagent = superagent;
};

module.exports.World = World;