'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
var xmlparser = require('express-xml-bodyparser');

var https = require('https');
var http = require('http');
var sslConfig = require('./ssl-config');

var app = module.exports = loopback();
var config = require('../config/config')
app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

app.use(xmlparser());

// app.use(utils.sign(config));
app.DisableSystemMethod = function (_basemodel) {
  _basemodel.disableRemoteMethodByName("create", true);
  _basemodel.disableRemoteMethodByName("upsert", true);
  _basemodel.disableRemoteMethodByName("updateAll", true);
  _basemodel.disableRemoteMethodByName("updateAttributes", false);

  _basemodel.disableRemoteMethodByName("find", true);
  _basemodel.disableRemoteMethodByName("findById", true);
  _basemodel.disableRemoteMethodByName("findOne", true);

  _basemodel.disableRemoteMethodByName("replaceById", true);
  _basemodel.disableRemoteMethodByName("createChangeStream", true);
  _basemodel.disableRemoteMethodByName("upsertWithWhere", true);
  _basemodel.disableRemoteMethodByName("replaceOrCreate", true);
  _basemodel.disableRemoteMethodByName("deleteById", true);
  _basemodel.disableRemoteMethodByName("getId", true);

  _basemodel.disableRemoteMethodByName("confirm", true);
  _basemodel.disableRemoteMethodByName("count", true);
  _basemodel.disableRemoteMethodByName("exists", true);
  _basemodel.disableRemoteMethodByName("resetPassword", true);

  _basemodel.disableRemoteMethodByName('__count__accessTokens', false);
  _basemodel.disableRemoteMethodByName('__create__accessTokens', false);
  _basemodel.disableRemoteMethodByName('__delete__accessTokens', false);
  _basemodel.disableRemoteMethodByName('__destroyById__accessTokens', false);
  _basemodel.disableRemoteMethodByName('__findById__accessTokens', false);
  _basemodel.disableRemoteMethodByName('__get__accessTokens', false);
  _basemodel.disableRemoteMethodByName('__updateById__accessTokens', false);
};
// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.


app.start = function (httpOnly) {
    // start the web server
    if (httpOnly === undefined) {
        httpOnly = process.env.HTTP;
    }
    var server = null;
    if (!httpOnly) {
        var options = {
            key: sslConfig.privateKey,
            cert: sslConfig.certificate,
        };
        server = https.createServer(options, app);
    } else {
        server = http.createServer(app);
    }

    var os = require('os');

    console.log('This platform is ' + os.platform());
    var _port = app.get('port');

    // if (os.platform() == 'darwin') {
    //     _port = 6800;
    // }
    server.listen(_port, function () {
        //  server.listen(6800, function() {       
        var baseUrl = (httpOnly ? 'http://' : 'https://') + app.get('host') + ':' + _port;
        app.emit('started', baseUrl);
        console.log('LoopBack server listening @ %s%s', baseUrl, '/explorer');
    });

    return server;
};


boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
   try{
    app.start(true);
   }
  catch(err){
    EWTRACEIFY(err);
  }
});
