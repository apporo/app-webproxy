'use strict';

var events = require('events');
var util = require('util');

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var debuglog = debug('appWebrouter:service');

var httpProxy = require('http-proxy');

var Service = function(params) {
  debuglog.isEnabled && debuglog(' + constructor begin ...');

  params = params || {};

  var self = this;

  self.logger = params.loggingFactory.getLogger();

  self.getSandboxName = function() {
    return params.sandboxName;
  };

  var mappingStore = params.webrouterManager.getMappingStore();

  var webserverTrigger = params.webserverTrigger;
  var express = webserverTrigger.getExpress();
  var position = webserverTrigger.getPosition();

  var pluginCfg = lodash.get(params, ['sandboxConfig', 'plugins', 'appWebrouter'], {});

  var proxy = httpProxy.createProxyServer({});

  var app = express();

  if (debuglog.isEnabled) {
    app.get('*', function(req, res, next) {
      debuglog(' - Invoker IP: %s / %s', req.ip, JSON.stringify(req.ips));
      debuglog(' - protocol:%s; hostname:%s', req.protocol, req.hostname);
      debuglog(' - baseUrl    :%s', req.baseUrl);
      debuglog(' - originalUrl:%s', req.originalUrl);
      debuglog(' - Url        :%s', req.url);
      debuglog(' - path       :%s', req.path);
      next();
    });
  }

  app.get('*', function(req, res, next) {
    var reqUrl = req.url || '';
    var mapping = mappingStore.matches(reqUrl);
    if (lodash.isObject(mapping)) {
      debuglog.isEnabled && debuglog(' - mapping found: %s', JSON.stringify(mapping));
      req.url = reqUrl.replace(mapping.source.urlPattern, mapping.target.url);
      proxy.web(req, res, {
        headers: {
          host: mapping.target.hostname
        },
        target: mapping.target.address
      });
    } else {
      debuglog.isEnabled && debuglog(' - mapping not found, continue the next()');
      next();
    }
  });

  var contextPath = pluginCfg.contextPath || '/webrouter';
  var mappingPath = pluginCfg.mappingPath || '/mappings';
  webserverTrigger.inject(params.webrouterManager.buildRestRouter(express),
      contextPath + mappingPath, position.inRangeOfMiddlewares(), 'appWebrouter-manager');
  webserverTrigger.inject(app, null, position.afterMiddlewares(), 'appWebrouter-service');

  self.getServiceInfo = function() {
    return {};
  };

  self.getServiceHelp = function() {
    return {};
  };

  debuglog.isEnabled && debuglog(' - constructor end!');
};

Service.argumentSchema = {
  "id": "webrouterService",
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
    "webserverTrigger": {
      "type": "object"
    }
  }
};

module.exports = Service;
