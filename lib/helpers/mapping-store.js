'use strict';

var events = require('events');
var util = require('util');
var url = require('url');
var syncblock = require('syncblock');
var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var debuglog = debug('appWebrouter:mappingStore');

var MappingStore = function(params) {
  var mappingOpts = params = params || {};
  debuglog.isEnabled && debuglog(' - mappingOpts: %s', JSON.stringify(mappingOpts));

  var mappingSourceRef = {};
  if (lodash.isArray(mappingOpts.sources)) {
    var mappingSourceList = lodash.filter(mappingOpts.sources, function(item) {
      return (item.enabled != false);
    });
    mappingSourceRef = lodash.keyBy(mappingSourceList, 'type');
  }
  debuglog.isEnabled && debuglog(' - mappingSourceRef: %s', JSON.stringify(mappingSourceRef));

  var loadFromConfig = function(mappingSource) {
    debuglog.isEnabled && debuglog(' - load mappingRules from Configuration: %s', JSON.stringify(mappingSource));
    return Promise.resolve(mappingSource['rules']);
  }

  var loadFromMongodb = function(mappingSource, mongodbWrapper) {
    debuglog.isEnabled && debuglog(' - load mappingRules from MongoDB: %s', JSON.stringify(mappingSource));
    return mongodbWrapper.getDbObject().then(function(db) {
      var collectionName = mappingSource.collectionName || 'mappingrules';
      debuglog.isEnabled && debuglog(' - open the collection named [%s]', collectionName);
      var collection = db.collection(collectionName);
      return Promise.promisify(function(done) {
        collection.find({}).toArray(function(err, docs) {
          debuglog.isEnabled && debuglog(' - result from MongoDB: %s', JSON.stringify(docs));
          done(err, docs);
        });
      })().then(function(result) {
        db.close();
        return Promise.resolve(result);
      }).catch(function(exception) {
        db.close();
        return Promise.reject(exception);
      });
    }).catch(function(error) {
      debuglog.isEnabled && debuglog(' - Error on load mappingRules from MongoDB: %s', JSON.stringify(error));
      return Promise.resolve([]);
    });
  };

  var transformMappingRules = function(mappingRuleRef, mappings) {
    mappings = mappings || {};
    lodash.forOwn(mappingRuleRef, function(mappingObject, mappingName) {
      debuglog.isEnabled && debuglog(' - mappingObject: %s', JSON.stringify(mappingObject));
      if (mappingObject.enabled != false) {
        var tPort = mappingObject.target.port;
        tPort = (!tPort || tPort == 80 || tPort == 443) ? '' : tPort;
        var mappingRule = { source: {}, target: {} };
        mappingRule.source.urlPattern = new RegExp(mappingObject.source.url || '/(.*)');
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

  var mappingRuleRef = null;
  var mappings = null;

  var ready = function() {
    if (mappingRuleRef != null && mappings != null) return Promise.resolve(mappings);
    return Promise.resolve().then(function() {
      switch(mappingOpts.default) {
        case 'static':
          return loadFromConfig(mappingSourceRef[mappingOpts.default]);
        case 'mongodb':
          return loadFromMongodb(mappingSourceRef[mappingOpts.default], mappingOpts.mongodbWrapper);
      }
      return [];
    }).then(function(mappingRuleList) {
      debuglog.isEnabled && debuglog(' - mappingRuleList: %s', JSON.stringify(mappingRuleList));
      mappingRuleRef = lodash.keyBy(mappingRuleList, 'id');
      debuglog.isEnabled && debuglog(' - mappingRuleRef: %s', JSON.stringify(mappingRuleRef));
      mappings = transformMappingRules(mappingRuleRef);
      return mappings;
    });
  };

  this.match = function(reqUrl) {
    return ready().then(function(mappings) {
      var mappingList = lodash.values(mappings);
      for(var i=0; i<mappingList.length; i++) {
        var mapping = mappingList[i];
        if (reqUrl.match(mapping.source.urlPattern)) return mapping;
      }
      return null;
    })
  };

  this.find = function(criteria, ctx) {
    return ready().then(function(mappings) {
      return lodash.values(mappings);
    });
  };

  this.get = function(id, ctx) {
    return ready().then(function() {
      return mappingRuleRef[id];
    });
  };

  this.create = function(mapping, ctx) {
    return ready().then(function() {
      return {};
    });
  };

  this.change = function(id, mapping, ctx) {
    return ready().then(function() {
      return {};
    });
  };

  this.update = function(id, mapping, ctx) {
    return ready().then(function() {
      return {};
    });
  };

  this.delete = function(id, ctx) {
    return ready().then(function() {
      return {};
    });
  };

  this.reload = function(ctx) {
    mappings = null;
    return ready().then(function(mappings) {
      return lodash.values(mappings);
    });
  };

  syncblock.begin(function(ticket) {
    debuglog.isEnabled && debuglog(' - MappingStore() constructor - enter syncblock');
    ready().finally(function() {
      debuglog.isEnabled && debuglog(' - MappingStore() constructor - end of syncblock');
      ticket.end();
    });
  });
};

module.exports = MappingStore;
