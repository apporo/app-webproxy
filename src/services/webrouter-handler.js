'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const chores = Devebot.require('chores');
const lodash = Devebot.require('lodash');
const pinbug = Devebot.require('pinbug');
const httpProxy = require('http-proxy');

function WebrouterHandler(params) {
  params = params || {};
  let self = this;

  let LX = params.loggingFactory.getLogger();
  let LT = params.loggingFactory.getTracer();
  let packageName = params.packageName || 'app-webrouter';
  let blockRef = chores.getBlockRef(__filename, packageName);

  LX.has('silly') && LX.log('silly', LT.toMessage({
    tags: [ blockRef, 'constructor-begin' ],
    text: ' + constructor begin ...'
  }));

  let pluginCfg = params.sandboxConfig;
  let proxy = httpProxy.createProxyServer({});

  proxy.on('proxyReq', function(proxyReq, req, res, options) {
    if(lodash.isObject(req.body)) {
      let bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type','application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  });

  let debugx = null;
  self.buildRestRouter = function(express) {
    let app = express();

    app.all('*', function(req, res, next) {
      let reqUrl = req.url || '';
      let reqMethod = req.method;
      params.webrouterStorage.match(reqUrl, reqMethod).then(function(mapping) {
        if (lodash.isObject(mapping)) {
          LX.has('debug') && LX.log('debug', LT.add({ mapping }).toMessage({
            text: ' - mapping found: ${mapping}'
          }));
          req.url = reqUrl.replace(mapping.source.urlPattern, mapping.target.url);

          if (mapping.target.response && mapping.target.response.headers) {
            let _setHeader = res.setHeader;
            res.setHeader = function(name, value) {
              let _name = name.toLowerCase();
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
          LX.has('debug') && LX.log('debug', LT.toMessage({
            text: ' - mapping not found, continue the next()'
          }));
          next();
        }
      }).catch(function(error) {
        LX.has('error') && LX.log('error', LT.add({ error }).toMessage({
          text: ' - error occurred when matching: ${error}'
        }));
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

WebrouterHandler.referenceList = [ "webrouterStorage" ];

module.exports = WebrouterHandler;
