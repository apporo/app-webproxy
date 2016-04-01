'use strict';

var events = require('events');
var util = require('util');
var url = require('url');

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

  app.get('*', function(req, res, next) {
    if (debuglog.isEnabled) {
      debuglog(' - Invoker IP: %s / %s', req.ip, JSON.stringify(req.ips));
      debuglog(' - protocol:%s; hostname:%s', req.protocol, req.hostname);
      debuglog(' - baseUrl    :%s', req.baseUrl);
      debuglog(' - originalUrl:%s', req.originalUrl);
      debuglog(' - Url        :%s', req.url);
      debuglog(' - path       :%s', req.path);
    }

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

    // lodash.forOwn(mappings, function(mapping, mappingName) {
    //   if (reqUrl.match(mapping.source.urlPattern)) {
    //     req.url = reqUrl.replace(mapping.source.urlPattern, mapping.target.url);
    //     proxy.web(req, res, {
    //       headers: {
    //         host: mapping.target.hostname
    //       },
    //       target: mapping.target.address
    //     });
    //   }
    // });
  });

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
