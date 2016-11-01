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

  var proxy = httpProxy.createProxyServer({});

  self.buildRestRouter = function(express) {
    var app = express();

    if (false && debuglog.isEnabled) {
      app.all('*', function(req, res, next) {
        debuglog(' - Invoker IP: %s / %s', req.ip, JSON.stringify(req.ips));
        debuglog(' - protocol:%s; hostname:%s', req.protocol, req.hostname);
        debuglog(' - baseUrl    :%s', req.baseUrl);
        debuglog(' - originalUrl:%s', req.originalUrl);
        debuglog(' - url        :%s', req.url);
        debuglog(' - path       :%s', req.path);
        debuglog(' - method     :%s', req.method);
        next();
      });
    }

    app.all('*', function(req, res, next) {
      var reqUrl = req.url || '';
      var reqMethod = req.method;
      params.webrouterStorage.match(reqUrl, reqMethod).then(function(mapping) {
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
      }).catch(function(error) {
        debuglog.isEnabled && debuglog(' - error occurred when matching: %s',
            lodash.isObject(error) ? JSON.stringify(error) : error);
        next();
      });
    });

    return app;
  };

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
    "webrouterStorage": {
      "type": "object"
    }
  }
};

module.exports = Service;
