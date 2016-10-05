'use strict';

var events = require('events');
var util = require('util');
var url = require('url');

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var debuglog = debug('appWebrouter:manager');

var Service = function(params) {
  debuglog.isEnabled && debuglog(' + constructor begin ...');

  params = params || {};

  var self = this;

  var pluginCfg = lodash.get(params, ['sandboxConfig', 'plugins', 'appWebproxy'], {});
  var mappingOpts = lodash.get(pluginCfg, ['mappings'], {});
  var mappingStore = new MappingStore(mappingOpts);

  self.logger = params.loggingFactory.getLogger();

  self.getSandboxName = function() {
    return params.sandboxName;
  };

  self.getMappingStore = function() {
    return mappingStore;
  };

  self.buildRestRouter = function(express) {
    var router = express.Router();

    router.route('/:id').get(function(req, res, next) {
      self.logger.debug('GET [/%s] - Request[%s]', req.params.id, req.traceRequestId);
      return mappingStore.get(id).then(function (result) {
        result = result || {};
        self.logger.debug('Mapping: %s - Request[%s]', JSON.stringify(lodash.pick(result, [
          'enabled', 'id', 'source', 'target'
        ])), req.traceRequestId);
        res.json(result);
      }).catch(function(err) {
        self.logger.error('Encounter an error: %s - Request[%s]', JSON.stringify(err), req.traceRequestId);
        res.send(err);
      }).finally(function() {
        self.logger.debug('Finally - Request[%s]', req.traceRequestId);
      });
    });

    return router;
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
  "id": "webrouterManager",
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
    }
  }
};

module.exports = Service;

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

  this.get = function(id) {
    return Promise.promisify(function(mappingId, done) {
      done(null, {});
    })(id);
  };
};
