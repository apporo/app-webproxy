'use strict';

var app = require('devebot').launchApplication({
  appRootPath: __dirname
}, [
  '../../index.js',
  'app-webserver'
], [
  'devebot-co-mongodb'
]);

if (require.main === module) app.server.start();

module.exports = app;
