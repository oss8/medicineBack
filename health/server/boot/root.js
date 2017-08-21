'use strict';

module.exports = function (server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  server.use(router);

  var _ = require('underscore');


  var TokenList = [
    'RequestUserInfo',
    'ModifyUserInfo',
    'RequestMyQRCode',
    'ModifyFollowInfo',
    'removeFollow',
    'RequestUserMonitor'
  ];


  router.use(function (req, res, next) {
    var f_name = req.path.substr(req.path.lastIndexOf('/') + 1);

    var find = _.find(TokenList, function (item) {
      return item.toUpperCase() == f_name.toUpperCase();
    })

    if (!_.isEmpty(find)) {
      if (req.headers.token == undefined) {
        res.writeHead(401);
        res.end();
      }
      else {
        var OpenID = {};
        try {
          OpenID = GetOpenIDFromToken(req.headers.token);
          next();
        } catch (err) {
          res.writeHead(403);
          res.end();
        }
      }
    }
    else {
      next();
    }
  })

};
