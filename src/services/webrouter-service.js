'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const chores = Devebot.require('chores');
const lodash = Devebot.require('lodash');

function WebrouterService(params) {
  params = params || {};
  let self = this;

  let LX = params.loggingFactory.getLogger();
  let LT = params.loggingFactory.getTracer();
  let packageName = params.packageName || 'app-webrouter';
  let blockRef = chores.getBlockRef(__filename, packageName);

  LX.has('silly') && LX.log('silly', LT.toMessage({
    tags: [ blockRef, 'constructor-begin' ],
    text: ' + constructor begin ...'
  }));

  let pluginCfg = params.sandboxConfig;
  let contextPath = pluginCfg.contextPath || '/webrouter';
  let webweaverService = params['app-webweaver/webweaverService'];
  let express = webweaverService.express;

  let httpProxyRouter = params.webrouterHandler.buildRestRouter(express);

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

WebrouterService.referenceList = [
  "webrouterHandler",
  "app-webweaver/webweaverService"
];

module.exports = WebrouterService;
