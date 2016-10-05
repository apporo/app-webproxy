'use strict';

var events = require('events');
var util = require('util');

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var debuglog = debug('appWebrouter:manager');

var MappingStore = require('../helpers/mapping-store.js');

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
