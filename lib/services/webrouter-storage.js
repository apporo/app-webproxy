'use strict';

var events = require('events');
var util = require('util');
var url = require('url');
var syncblock = require('syncblock');
var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var debuglog = debug('appWebrouter:storage');

var Service = function(params) {
  debuglog.isEnabled && debuglog(' + constructor begin ...');

  params = params || {};

  var self = this;

  var pluginCfg = lodash.get(params, ['sandboxConfig', 'plugins', 'appWebrouter'], {});

  var mappingSourceCfg = lodash.get(pluginCfg, ['mappings'], {});
  var mappingSourceRef = {};
  if (lodash.isArray(mappingSourceCfg.sources)) {
    var mappingSourceList = lodash.filter(mappingSourceCfg.sources, function(item) {
      return (item.enabled != false);
    });
    mappingSourceRef = lodash.keyBy(mappingSourceList, 'type');
  }
  debuglog.isEnabled && debuglog(' - mappingSourceRef: %s', JSON.stringify(mappingSourceRef));

  var externalCfg = mappingSourceRef['external'] || {};
  var confighub = null;

  if (externalCfg.enabled != false) {
    var externalCfgName = externalCfg.configKey || externalCfg.configName || 'app-webrouter';
    confighub = params.confighubService.register(externalCfgName, {
      schema: mappingSourceCfg.ruleSchema || {
        "type": "object",
        "properties": {
          "rules": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "enabled": {
                  "type": "boolean"
                },
                "source": {
                  "type": "object",
                  "properties": {
                    "url": {
                      "type": "string"
                    },
                    "methods": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    }
                  },
                  "required": ["url"]
                },
                "target": {
                  "type": "object",
                  "properties": {
                    "hostname": {
                      "type": "string"
                    },
                    "port": {
                      "type": "integer"
                    },
                    "url": {
                      "type": "string"
                    }
                  },
                  "required": ["hostname", "url"]
                }
              },
              "required": ["id", "source", "target"]
            }
          }
        }
      }
    });
    if (lodash.isObject(confighub)) {
      confighub.on('extend', function() {
        mappings = null;
        mappingRuleRef = null;
      });
    }
  }

  var mappingRuleRef = null;
  var mappings = null;

  var transformMappingRules = function(mappingRuleRef, mappings) {
    mappings = mappings || {};
    lodash.forOwn(mappingRuleRef, function(mappingObject, mappingName) {
      debuglog.isEnabled && debuglog(' - mappingObject: %s', JSON.stringify(mappingObject));
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
          hostname: mappingObject.target.hostname,
          port: tPort
        });
        mappingRule.target.hostname = mappingObject.target.hostname;
        mappingRule.target.url = mappingObject.target.url;
        mappings[mappingName] = mappingRule;
      }
    });
    return mappings;
  };

  var internalCfg = mappingSourceRef['internal'] || {};
  var ready = function() {
    if (mappingRuleRef != null && mappings != null) return Promise.resolve(mappings);
    mappingRuleRef = lodash.keyBy(internalCfg.rules || {}, 'id');
    debuglog.isEnabled && debuglog(' - mappingRuleRef ~ internal config: %s', JSON.stringify(mappingRuleRef));
    return confighub.loadConfig().then(function(externalConfig) {
      if (lodash.isArray(externalConfig.rules)) {
        lodash.assign(mappingRuleRef, lodash.keyBy(externalConfig.rules, 'id'));
      }
      debuglog.isEnabled && debuglog(' - mappingRuleRef ~ external config: %s', JSON.stringify(mappingRuleRef));
      mappings = transformMappingRules(mappingRuleRef);
      return mappings;
    });
  };

  this.match = function(reqUrl, reqMethod) {
    if (!reqUrl) return Promise.reject({ message: 'invalid request url'});
    return ready().then(function(mappings) {
      var mappingList = lodash.values(mappings);
      for(var i=0; i<mappingList.length; i++) {
        var mapping = mappingList[i];
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
    debuglog.isEnabled && debuglog(' - webrouterStorage() constructor - enter syncblock');
    ready().finally(function() {
      debuglog.isEnabled && debuglog(' - webrouterStorage() constructor - end of syncblock');
      ticket.end();
    });
  });

  self.getServiceInfo = function() {
    return {};
  };

  self.getServiceHelp = function() {
    return {};
  };

  debuglog.isEnabled && debuglog(' - constructor end!');
};

Service.argumentSchema = {
  "id": "webrouterStorage",
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
    "confighubService": {
      "type": "object"
    }
  }
};

module.exports = Service;
