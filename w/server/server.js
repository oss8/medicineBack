var querystring = require("querystring");
var express = require('express');
var passport = require('passport');
var jwttoken = require('../lib/jwttoken.js')();
var wechatConfig = require('../config/wechatConfig.json');
//var WeixinStrategy = require('passport-weixin-plus');
var WechatStrategy = require('passport-wechat');
var config = {
  weixinAuth: {
    host2appKeyMap: {
      'global': {
        appkey: '',
        secret: ''          
      },
      'demo.mydomain.cn': {
        appkey: '1xxxxxxxxxxxxxxxxx',
        secret: '1yyyyyyyyyyyyyyyyyyyyyyyy'
      },
      'xxx.mydomain.cn': {
        appkey: '2xxxxxxxxxxxxxxxxx',
        secret: '2yyyyyyyyyyyyyyyyyyyyyyyy'
      },
      'www.mydomain.cn': {
        appkey: '3xxxxxxxxxxxxxxxxx',
        secret: '3yyyyyyyyyyyyyyyyyyyyyyyy'
      }
    },
    callbackURL: '/auth/weixin/callback'
  },
};
/*
passport.use(new WeixinStrategy({
  clientID: function(req) {
    var appKeyMap = config.weixinAuth.host2appKeyMap[req.headers.host] || config.weixinAuth.host2appKeyMap["global"];
    return appKeyMap.appkey;
  },
  clientSecret: function(req) {
    var appKeyMap = config.weixinAuth.host2appKeyMap[req.headers.host] || config.weixinAuth.host2appKeyMap["global"];
    return appKeyMap.secret;
  },
  callbackURL: function(req) {
    var bu = req.query.bu;
    return "http://" + req.headers.host + config.weixinAuth.callbackURL+"?"+querystring.stringify({bu: bu});
  },
  requireState: false,
  scope: 'snsapi_base',
  authorizationURL: 'https://open.weixin.qq.com/connect/oauth2/authorize',
  passReqToCallback: true
}, function(req, token, refreshToken, profile, done) {
  done(null, profile);
}));
*/

 passport.use(new WechatStrategy({
        appID: wechatConfig.appID,
        name:'wechat',
        appSecret: wechatConfig.appSecret,
        client: 'wechat',
        //callbackURL: {CALLBACKURL},
        scope: 'snsapi_userinfo',
        state: 'init'/*,
        getToken: {getToken},
        saveToken: {saveToken}*/
      },
      function(accessToken, refreshToken, profile, expires_in, done) {
        return done(null, profile);
      }
));

var app = express();
app.use(passport.initialize());
/*
app.get('/auth/weixin/callback', function(req, res, next) {
  passport.authenticate('weixin', function(err, user, info) {
    if (err) return next(err)

    //do anything as you like

    res.send(user);
  })(req, res, next);
});
*/
app.get('/auth/wechat', passport.authenticate('wechat', {
    scope: function(req) {
        var scope = req.query.scope;
        return scope || "snsapi_userinfo";
    },
    callbackURL: function(req){
        var bu = req.query.bu;
        return "http://" + req.headers.host + "/auth/wechat/callback?"+querystring.stringify({bu: bu});
        //return "http://w.downtown8.cn/auth/wechat/callback?"+querystring.stringify({bu: bu});
    }
}));
app.get('/auth/wechat/callback', passport.authenticate('wechat',{ session: false }),
  function(req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
    var bu = req.query.bu;
    var payload = req.user;
    var nowsecond = Math.floor(Date.now() / 1000);
    payload.iat = nowsecond;
    payload.exp = nowsecond + (5 * 60);
    jwttoken.encode(payload, function(err, token){
        if(err){
            res.sendStatus(403);
        }else{
            res.redirect(bu + (bu.indexOf('?')>0?"&":"?")+querystring.stringify({token: token}));
        }
    });
  }
);
app.listen(10401);