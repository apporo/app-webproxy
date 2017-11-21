'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var debugx = Devebot.require('debug')('appWebrouter:service');

var Service = function(params) {
  debugx.enabled && debugx(' + constructor begin ...');

  params = params || {};

  var self = this;
  var logger = params.loggingFactory.getLogger();
  var pluginCfg = params.sandboxConfig;
  var contextPath = pluginCfg.contextPath || '/webrouter';
  var express = params.webweaverService.express;

  var httpProxyRouter = params.webrouterHandler.buildRestRouter(express);

  self.getHttpProxyLayer = function(path) {
    return {
      name: 'app-webrouter-service',
      path: path,
      middleware: httpProxyRouter
    }
  }

  if (pluginCfg.autowired !== false) {
    params.webweaverService.push([
      self.getHttpProxyLayer()
    ], pluginCfg.priority);
  }

  debugx.enabled && debugx(' - constructor end!');
};

Service.argumentSchema = {
  "properties": {
    "webrouterHandler": {
      "type": "object"
    },
    "webweaverService": {
      "type": "object"
    }
  }
};

module.exports = Service;
