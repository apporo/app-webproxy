'use strict';

var events = require('events');
var util = require('util');
var url = require('url');

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var debuglog = debug('appWebrouter:mappingStore');

var MappingStore = function(params) {
  var mappingOpts = params || {};
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

  this.matches = function(reqUrl) {
    var mapping = null;
    for(var i=0; i<mappingList.length; i++) {
      mapping = mappingList[i];
      if (reqUrl.match(mapping.source.urlPattern)) break;
    }
    return mapping;
  };

  this.find = function(criteria, ctx) {
    return Promise.promisify(function(done) {
      done(null, []);
    })();
  };

  this.get = function(id, ctx) {
    return Promise.promisify(function(mappingId, done) {
      done(null, {});
    })(id);
  };

  this.change = function(id, mapping, ctx) {
    return Promise.promisify(function(mappingId, done) {
      done(null, {});
    })(id);
  };

  this.update = function(id, mapping, ctx) {
    return Promise.promisify(function(mappingId, done) {
      done(null, {});
    })(id);
  };

  this.delete = function(id, ctx) {
    return Promise.promisify(function(mappingId, done) {
      done(null, {});
    })(id);
  };

  this.refresh = function(ctx) {
    return Promise.promisify(function(done) {
      done(null, []);
    })();
  };
};

module.exports = MappingStore;
