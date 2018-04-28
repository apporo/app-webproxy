'use strict';

var locks = require('locks');
var url = require('url');
var syncblock = require('syncblock');
var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var chores = Devebot.require('chores');
var lodash = Devebot.require('lodash');
var debugx = Devebot.require('pinbug')('app-webrouter:storage');
var defaultRuleSchema = require('../utils/rule-schema');

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
  var defaultRequestHeaders = lodash.get(pluginCfg, ['request', 'headers'], {
    'accept-encoding': '*;q=1,gzip=0'
  });

  var mappingCfg = lodash.get(pluginCfg, ['mappings'], {});

  var ruleSchema = mappingCfg.ruleSchema || defaultRuleSchema;

  var declaredRuleRef = null;
  var compiledRuleRef = null;
  var runtimeRuleList = null;

  var transformMappingRules = function(declaredRuleRef, compiledRuleRef) {
    compiledRuleRef = compiledRuleRef || {};
    lodash.forOwn(declaredRuleRef, function(mappingObject, mappingName) {
      debugx.enabled && debugx(' - mappingObject: %s', JSON.stringify(mappingObject));
      if (mappingObject.enabled != false) {
        var tPort = mappingObject.target.port;
        tPort = (!tPort || tPort == 80 || tPort == 443) ? '' : tPort;
        var mappingRule = { source: {}, target: {} };
        mappingRule.source.urlPattern = new RegExp(mappingObject.source.url || '/(.*)');
        if (lodash.isArray(mappingObject.source.methods) && !lodash.isEmpty(mappingObject.source.methods)) {
          mappingRule.source.methods = lodash.map(mappingObject.source.methods, function(methodName) {
            return lodash.toUpper(methodName);
          });
        }
        mappingRule.target.address = url.format({
          protocol: mappingObject.target.protocol || 'http',
          hostname: mappingObject.target.ip || mappingObject.target.hostname,
          port: tPort
        });
        mappingRule.target.hostname = mappingObject.target.hostname;
        mappingRule.target.url = mappingObject.target.url;

        mappingRule.target.request = { headers: lodash.clone(defaultRequestHeaders) };
        if (lodash.isObject(mappingObject.target.request) && lodash.isArray(mappingObject.target.request.headers)) {
          lodash.forEach(mappingObject.target.request.headers, function(headerObj) {
            if (headerObj.value) {
              mappingRule.target.request.headers[headerObj.name] = headerObj.value;
            }
          });
        }

        if (lodash.isObject(mappingObject.target.response)) {
          mappingRule.target.response = {};
          if (lodash.isArray(mappingObject.target.response.headers)) {
            mappingRule.target.response.headers = lodash.keyBy(mappingObject.target.response.headers, 'name');
          }
        }

        if (lodash.isObject(mappingObject.target.authentication)) {
          var authInfo = mappingObject.target.authentication;
          if (authInfo.enabled != false && authInfo.type === 'basic' && authInfo.username && authInfo.password) {
            var authString = "Basic " + (new Buffer(authInfo.username + ':' + authInfo.password).toString('base64'));
            mappingRule.target.request.headers = mappingRule.target.request.headers || {};
            mappingRule.target.request.headers['authorization'] = authString;
          }
        }
        compiledRuleRef[mappingName] = mappingRule;
      }
    });
    return compiledRuleRef;
  };

  var transformMutex = locks.createMutex();

  var getRules = function() {
    if (declaredRuleRef && compiledRuleRef && runtimeRuleList) return Promise.resolve(runtimeRuleList);
    return new Promise(function(onResolved) {
      transformMutex.lock(function() {
        onResolved();
      });
    }).then(function() {
      if (declaredRuleRef == null) {
        compiledRuleRef = null;
        declaredRuleRef = lodash.keyBy(mappingCfg.rules || {}, 'id');
      }
      if (compiledRuleRef == null) {
        runtimeRuleList = null;
        compiledRuleRef = transformMappingRules(declaredRuleRef);
      }
      if (runtimeRuleList == null) {
        runtimeRuleList = lodash.values(compiledRuleRef);
      }
      return runtimeRuleList;
    }).finally(function() {
      transformMutex.unlock();
    });
  }

  this.update = function(externalConfig, context) {
    externalConfig = externalConfig || {};
    context = context || {};
    if (['save'].indexOf(context.event) >= 0) return;
    if (lodash.isArray(externalConfig.rules)) {
      if (context.action === 'reset') {
        lodash.forEach(lodash.keys(declaredRuleRef), function (prop) {
          delete declaredRuleRef[prop];
        });
      }
      lodash.assign(declaredRuleRef, lodash.keyBy(externalConfig.rules, 'id'));
      compiledRuleRef = null;
    }
  }

  this.match = function(reqUrl, reqMethod) {
    if (!reqUrl) return Promise.reject({ message: 'invalid request url'});
    return getRules().then(function(runtimeRuleList) {
      for(var i=0; i<runtimeRuleList.length; i++) {
        var mapping = runtimeRuleList[i];
        if (reqUrl.match(mapping.source.urlPattern)) {
          if (!reqMethod || lodash.isEmpty(mapping.source.methods) || (mapping.source.methods.indexOf(reqMethod) >= 0)) {
            return mapping;
          }
        }
      }
      return null;
    });
  };

  syncblock.begin(function(ticket) {
    debugx.enabled && debugx(' - webrouterStorage() constructor - enter syncblock');
    getRules().finally(function() {
      debugx.enabled && debugx(' - webrouterStorage() constructor - end of syncblock');
      ticket.end();
    });
  });

  LX.has('silly') && LX.log('silly', LT.toMessage({
    tags: [ blockRef, 'constructor-end' ],
    text: ' - constructor end!'
  }));
};

module.exports = Service;
