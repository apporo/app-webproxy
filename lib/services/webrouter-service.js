'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var chores = Devebot.require('chores');
var lodash = Devebot.require('lodash');
var debugx = Devebot.require('pinbug')('app-webrouter:service');

var Service = function(params) {
  params = params || {};
  var self = this;

  var LX = params.loggingFactory.getLogger();
  var LT = params.loggingFactory.getTracer();
  var packageName = params.packageName || 'app-webrouter';
  var blockRef = chores.getBlockRef(__filename, packageName);

  LX.has('silly') && LX.log('silly', LT.toMessage({
    tags: [ blockRef, 'constructor-begin' ],
    text: ' + constructor begin ...'
  }));

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

  LX.has('silly') && LX.log('silly', LT.toMessage({
    tags: [ blockRef, 'constructor-end' ],
    text: ' - constructor end!'
  }));
};

Service.referenceList = [ "webrouterHandler", "webweaverService" ];

module.exports = Service;
