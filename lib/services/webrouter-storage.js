'use strict';

var events = require('events');
var util = require('util');
var url = require('url');
var syncblock = require('syncblock');
var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var debuglog = debug('appWebrouter:storage');

var Service = function(params) {
  debuglog.isEnabled && debuglog(' + constructor begin ...');

  params = params || {};

  var self = this;

  var pluginCfg = lodash.get(params, ['sandboxConfig', 'plugins', 'appWebrouter'], {});
  var defaultRequestHeaders = lodash.get(pluginCfg, ['request', 'headers'], {
    'accept-encoding': '*;q=1,gzip=0'
  });

  var mappingCfg = lodash.get(pluginCfg, ['mappings'], {});

  var ruleSchema = mappingCfg.ruleSchema || {
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
                "hostname": {
                  "type": "string"
                },
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
                "ip": {
                  "type": "string",
                  "pattern": "^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$"
                },
                "port": {
                  "type": "integer"
                },
                "url": {
                  "type": "string"
                },
                "authentication": {
                  "type": "object",
                  "oneOf": [{
                    "properties": {
                      "enabled": {
                        "type": "boolean"
                      },
                      "type": {
                        "type": "string",
                        "enum": ["basic"]
                      },
                      "username": {
                        "type": "string"
                      },
                      "password": {
                        "type": "string"
                      }
                    },
                    "required" : ["type", "username", "password"]
                  }]
                },
                "request": {
                  "type": "object",
                  "properties": {
                    "headers": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "name": {
                            "type": "string",
                            "minLength": 1
                          },
                          "value": {
                            "type": ["string", "null"]
                          }
                        },
                        "required": ["name", "value"]
                      }
                    }
                  }
                },
                "response": {
                  "type": "object",
                  "properties": {
                    "headers": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "name": {
                            "type": "string",
                            "minLength": 1
                          },
                          "value": {
                            "type": ["string", "null"]
                          }
                        },
                        "required": ["name", "value"]
                      }
                    }
                  }
                }
              },
              "required": ["hostname", "url"]
            }
          },
          "required": ["id", "source", "target"]
        }
      }
    }
  };

  var mappingStoreRef = {};
  if (lodash.isArray(mappingCfg.sources)) {
    var mappingStoreList = lodash.filter(mappingCfg.sources, function(item) {
      return (item.enabled != false);
    });
    mappingStoreRef = lodash.keyBy(mappingStoreList, 'type');
  }
  debuglog.isEnabled && debuglog(' - mappingStoreRef: %s', JSON.stringify(mappingStoreRef));

  var externalCfg = mappingStoreRef['external'] || {};
  var confighub = null;

  if (externalCfg.enabled != false) {
    var externalCfgName = externalCfg.configKey || externalCfg.configName || 'app-webrouter';
    confighub = params.confighubService.register(externalCfgName, {
      schema: ruleSchema
    });
    if (lodash.isObject(confighub)) {
      confighub.on('extend', function() {
        declaredRuleRef = null;
      });
    }
  }

  var declaredRuleRef = null;
  var compiledRuleRef = null;
  var runtimeRuleList = null;

  var transformMappingRules = function(declaredRuleRef, compiledRuleRef) {
    compiledRuleRef = compiledRuleRef || {};
    lodash.forOwn(declaredRuleRef, function(mappingObject, mappingName) {
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

  var internalCfg = mappingStoreRef['internal'] || {};
  var ready = function() {
    if (declaredRuleRef && compiledRuleRef && runtimeRuleList) return Promise.resolve(runtimeRuleList);
    return Promise.resolve().then(function() {
      if (declaredRuleRef == null) {
        compiledRuleRef = null;
        declaredRuleRef = lodash.keyBy(internalCfg.rules || {}, 'id');
        debuglog.isEnabled && debuglog(' - declaredRuleRef ~ internal config: %s', JSON.stringify(declaredRuleRef));
        return confighub.loadConfig().then(function(externalConfig) {
          if (lodash.isArray(externalConfig.rules)) {
            lodash.assign(declaredRuleRef, lodash.keyBy(externalConfig.rules, 'id'));
          }
          debuglog.isEnabled && debuglog(' - declaredRuleRef ~ external config: %s', JSON.stringify(declaredRuleRef));
          return declaredRuleRef;
        });
      } else {
        return declaredRuleRef;
      }
    }).then(function() {
      if (compiledRuleRef == null) {
        runtimeRuleList = null;
        compiledRuleRef = transformMappingRules(declaredRuleRef);
      }
      return compiledRuleRef;
    }).then(function() {
      if (runtimeRuleList == null) {
        runtimeRuleList = lodash.values(compiledRuleRef);
      }
      return runtimeRuleList;
    });
  };

  this.match = function(reqUrl, reqMethod) {
    if (!reqUrl) return Promise.reject({ message: 'invalid request url'});
    return ready().then(function(runtimeRuleList) {
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
