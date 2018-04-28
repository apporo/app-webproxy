'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var chores = Devebot.require('chores');
var lodash = Devebot.require('lodash');
var debugx = Devebot.require('pinbug')('app-webrouter:handler');

var httpProxy = require('http-proxy');

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
  var proxy = httpProxy.createProxyServer({});

  proxy.on('proxyReq', function(proxyReq, req, res, options) {
    if(lodash.isObject(req.body)) {
      var bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type','application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  });

  self.buildRestRouter = function(express) {
    var app = express();

    if (pluginCfg.printRequestInfo && debugx.enabled) {
      app.all('*', function(req, res, next) {
        debugx(' - Invoker IP: %s / %s', req.ip, JSON.stringify(req.ips));
        debugx(' - protocol:%s; hostname:%s', req.protocol, req.hostname);
        debugx(' - baseUrl    :%s', req.baseUrl);
        debugx(' - originalUrl:%s', req.originalUrl);
        debugx(' - url        :%s', req.url);
        debugx(' - path       :%s', req.path);
        debugx(' - method     :%s', req.method);
        next();
      });
    }

    app.all('*', function(req, res, next) {
      var reqUrl = req.url || '';
      var reqMethod = req.method;
      params.webrouterStorage.match(reqUrl, reqMethod).then(function(mapping) {
        if (lodash.isObject(mapping)) {
          debugx.enabled && debugx(' - mapping found: %s', JSON.stringify(mapping));
          req.url = reqUrl.replace(mapping.source.urlPattern, mapping.target.url);

          if (mapping.target.response && mapping.target.response.headers) {
            var _setHeader = res.setHeader;
            res.setHeader = function(name, value) {
              var _name = name.toLowerCase();
              if (mapping.target.response.headers[_name]) {
                if (mapping.target.response.headers[_name].value != null) {
                  _setHeader.apply(res, [name, mapping.target.response.headers[_name].value]);
                }
              } else {
                _setHeader.apply(res, arguments);
              }
            }
          }

          proxy.web(req, res, {
            headers: lodash.assign({ host: mapping.target.hostname }, mapping.target.request.headers || {}),
            target: mapping.target.address
          });
        } else {
          debugx.enabled && debugx(' - mapping not found, continue the next()');
          next();
        }
      }).catch(function(error) {
        debugx.enabled && debugx(' - error occurred when matching: %s',
            lodash.isObject(error) ? JSON.stringify(error) : error);
        next();
      });
    });

    return app;
  };

  LX.has('silly') && LX.log('silly', LT.toMessage({
    tags: [ blockRef, 'constructor-end' ],
    text: ' - constructor end!'
  }));
};

Service.referenceList = [ "webrouterStorage" ];

module.exports = Service;