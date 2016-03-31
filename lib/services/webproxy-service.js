'use strict';

var events = require('events');
var util = require('util');

var lodash = require('devebot').pkg.lodash;
var debuglog = require('devebot').debug('webproxy');

var httpProxy = require('http-proxy');

var Service = function(params) {
  debuglog(' + constructor begin ...');
  Service.super_.apply(this);

  params = params || {};

  var self = this;
  
  self.logger = params.loggingFactory.getLogger();

  self.getSandboxName = function() {
    return params.sandboxname;
  };

  var webserverTrigger = params.webserverTrigger;
  var express = webserverTrigger.getExpress();
  var position = webserverTrigger.getPosition();

  var webproxyConfig = lodash.get(params, ['sandboxconfig', 'plugins', 'appWebproxy'], {});
  
  var app = express();

  webserverTrigger.inject(app, null, position.afterMiddlewares(), 'webproxy');

  self.getServiceInfo = function() {
    return {};
  };

  self.getServiceHelp = function() {
    return {};
  };

  debuglog(' - constructor end!');
};

Service.argumentSchema = {
  "id": "webproxyService",
  "type": "object",
  "properties": {
    "sandboxname": {
      "type": "string"
    },
    "sandboxconfig": {
      "type": "object"
    },
    "profileconfig": {
      "type": "object"
    },
    "generalconfig": {
      "type": "object"
    },
    "loggingFactory": {
      "type": "object"
    },
    "webserverTrigger": {
      "type": "object"
    }
  }
};

util.inherits(Service, events.EventEmitter);

module.exports = Service;
