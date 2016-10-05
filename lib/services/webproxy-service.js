'use strict';

var events = require('events');
var util = require('util');
var url = require('url');

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var debuglog = debug('appWebproxy');

var httpProxy = require('http-proxy');

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

  var webproxyConfig = lodash.get(params, ['sandboxConfig', 'plugins', 'appWebproxy'], {});
  var mappingOpts = lodash.get(webproxyConfig, ['mappings'], {});
  debuglog.isEnabled && debuglog(' - mappingOpts: %s', JSON.stringify(mappingOpts));

  var mappingSourceRef = {};
  if (lodash.isArray(mappingOpts.sources)) {
    var mappingSourceList = lodash.filter(mappingOpts.sources, function(item) {
      return (item.enabled != false);
    });
    mappingSourceRef = lodash.keyBy(mappingSourceList, 'type');
  }
  debuglog.isEnabled && debuglog(' - mappingSourceRef: %s', JSON.stringify(mappingSourceRef));

  var mappingRuleRef = {};
  if (mappingOpts.default == 'static') {
    var mappingRuleList = lodash.filter(mappingSourceRef[mappingOpts.default]['rules'], function(item) {
      return (item.enabled != false);
    });
    mappingRuleRef = lodash.keyBy(mappingRuleList, 'id');
  }
  debuglog.isEnabled && debuglog(' - mappingRuleRef: %s', JSON.stringify(mappingRuleRef));

  var mappingDefs = mappingRuleRef;
  var mappings = {};
  lodash.forOwn(mappingDefs, function(mappingDef, mappingName) {
    var tPort = mappingDef.target.port;
    tPort = (!tPort || tPort == 80 || tPort == 443) ? '' : tPort;

    var mappingRule = { source: {}, target: {} };
    mappingRule.source.urlPattern = new RegExp(mappingDef.source.url || '/(.*)');
    mappingRule.target.address = url.format({
      protocol: mappingDef.target.protocol || 'http',
      hostname: mappingDef.target.hostname,
      port: tPort
    });
    mappingRule.target.hostname = mappingDef.target.hostname;
    mappingRule.target.url = mappingDef.target.url;

    mappings[mappingName] = mappingRule;
  });
  var mappingList = lodash.values(mappings);
  debuglog.isEnabled && debuglog(' - mappingList: %s', JSON.stringify(mappingList, null, 2));

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

    var mapping = null;
    for(var i=0; i<mappingList.length; i++) {
      mapping = mappingList[i];
      if (reqUrl.match(mapping.source.urlPattern)) break;
    }

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

  webserverTrigger.inject(app, null, position.afterMiddlewares(), 'app-webproxy');

  self.getServiceInfo = function() {
    return {};
  };

  self.getServiceHelp = function() {
    return {};
  };

  debuglog.isEnabled && debuglog(' - constructor end!');
};

Service.argumentSchema = {
  "id": "webproxyService",
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
    "webserverTrigger": {
      "type": "object"
    }
  }
};

module.exports = Service;
