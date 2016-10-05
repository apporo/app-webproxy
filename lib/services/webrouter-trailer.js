'use strict';

var events = require('events');
var util = require('util');

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var debuglog = debug('appWebrouter:trailer');

var Service = function(params) {
  debuglog.isEnabled && debuglog(' + constructor begin ...');

  params = params || {};

  var self = this;

  self.logger = params.loggingFactory.getLogger();

  self.getSandboxName = function() {
    return params.sandboxName;
  };

  var webserverTrigger = params.webserverTrigger;
  var express = webserverTrigger.getExpress();
  var position = webserverTrigger.getPosition();

  var pluginCfg = lodash.get(params, ['sandboxConfig', 'plugins', 'appWebrouter'], {});
  var contextPath = pluginCfg.contextPath || '/webrouter';
  var mappingPath = pluginCfg.mappingPath || '/mappings';
  webserverTrigger.inject(params.webrouterManager.buildRestRouter(express),
      contextPath + mappingPath, position.inRangeOfMiddlewares(), 'appWebrouter-manager');
  webserverTrigger.inject(params.webrouterService.buildRestRouter(express),
      null, position.afterMiddlewares(), 'appWebrouter-service');

  self.getServiceInfo = function() {
    return {};
  };

  self.getServiceHelp = function() {
    return {};
  };

  debuglog.isEnabled && debuglog(' - constructor end!');
};

Service.argumentSchema = {
  "id": "webrouterTrailer",
  "type": "object",
  "properties": {
    "sandboxName": {
      "type": "string"
    },
    "sandboxConfig": {
      "type": "object"
    },
    "profileConfig": {
      "type": "object"
    },
    "generalConfig": {
      "type": "object"
    },
    "loggingFactory": {
      "type": "object"
    },
    "webrouterManager": {
      "type": "object"
    },
    "webrouterService": {
      "type": "object"
    },
    "webserverTrigger": {
      "type": "object"
    }
  }
};

module.exports = Service;
