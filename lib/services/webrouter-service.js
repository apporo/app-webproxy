'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var debugx = Devebot.require('pinbug')('app-webrouter:service');

var Service = function(params) {
  debugx.enabled && debugx(' + constructor begin ...');

  params = params || {};
  var self = this;

  var LX = params.loggingFactory.getLogger();

  var pluginCfg = params.sandboxConfig;
  var contextPath = pluginCfg.contextPath || '/webrouter';
  var webweaverService = params['webweaverService'];
  var express = webweaverService.express;

  var httpProxyRouter = params.webrouterHandler.buildRestRouter(express);

  self.getHttpProxyLayer = function(path) {
    return {
      name: 'app-webrouter-service',
      path: path,
      middleware: httpProxyRouter
    }
  }

  if (pluginCfg.autowired !== false) {
    webweaverService.push([
      self.getHttpProxyLayer()
    ], pluginCfg.priority);
  }

  debugx.enabled && debugx(' - constructor end!');
};

Service.referenceList = [ "webrouterHandler", "webweaverService" ];

module.exports = Service;
