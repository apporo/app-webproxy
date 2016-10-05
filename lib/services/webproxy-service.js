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
  var mappingDefs = lodash.get(webproxyConfig, ['mappings'], {
    'default-rule': {
      source: {
        url: '/(.*)'
      },
      target: {
        hostname: 'vnexpress.net',
        url: '/\$1'
      }
    }
  });

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

  var app = express();

  var proxy = httpProxy.createProxyServer({});

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
      req.url = reqUrl.replace(mapping.source.urlPattern, mapping.target.url);
      proxy.web(req, res, {
        headers: {
          host: mapping.target.hostname
        },
        target: mapping.target.address
      });
    } else {
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
