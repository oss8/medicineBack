'use strict';

module.exports = function (Patient) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Patient);
    var _ = require('underscore');
    var uuid = require('node-uuid');
    var needle = require('needle');


    Patient.modifyUserInfo = function (q, cb) {
        EWTRACE("modifyUserInfo Begin");

        var _openid = null;
        var OpenID = {};
        // try {
        //     OpenID = GetOpenIDFromToken(token);
        //     _openid = OpenID.openId;
        // } catch (err) {
        //     cb(null, { status: 403, "result": "" });
        //     return;
        // }

        OpenID = {
            openid: 'oFVZ-1Mf3yxWLWHQPE_3BhlVFnGU',
            nickname: '葛岭',
            sex: 1,
            language: 'zh_CN',
            city: 'hangzhou',
            province: 'Zhejiang',
            country: 'China',
            headimgurl: 'http://wx.qlogo.cn/mmopen/gjm1lrtibYr8Md4ZrTiaib9iaLWsDQyXe8R3bd5WtFvX7v6ibFL4Ky8MJCuOQ7LeObTxL42HPpL1L5ia3wLib9EmMrYBwxbCGibiat7Qn/0',
            privilege: [],
            iat: 1502711740,
            exp: 1502712040
        };
        _openid = OpenID.openid;


        var bsSQL = "select watchuserid from hh_publicuser where openid = '" + _openid + "'";
        DoSQL(bsSQL).then(function (result) {
            if (result.length == 0) {
                cb(new Error('未找到用户'), { status: 1, "result": "" });
            }
            q.userId = result[0].watchuserid;
            q.nickName = OpenID.nickname;

            bsSQL = "update hh_publicuser set ";
            if (!_.isUndefined(q.sex)) {
                bsSQL += "sex = " + q.sex + ",";
            }
            if (!_.isUndefined(q.age)) {
                bsSQL += "age = " + q.age + ",";
            }
            if (!_.isUndefined(q.height)) {
                bsSQL += "height = " + q.height + ",";
            }
            if (!_.isUndefined(q.weight)) {
                bsSQL += "height = " + q.weight + ",";
            }

            if (bsSQL.length > 28) {
                bsSQL = bsSQL.substr(0, bsSQL.length - 1);
                bsSQL += " where openid = '" + _openid + "'";
            } else {
                cb(null, { status: 1, "result": "" });
                return;
            }

            DoSQL(bsSQL).then(function () {

                var urlInfo = {"method":"updateUser.open"};
                CreateURL(urlInfo);

                needle.post(encodeURI(urlInfo.url),q, urlInfo.options, function (err, resp) {
                    if (err || resp.body.code != 0) {
                        cb(err, { status: 1, "result": "" });
                    }
                    else {
                        if (resp.body.code != 0) {
                            cb(new Error(resp.body.message), { status: 1, "result": "" });
                            return;
                        }
                        cb(null, { status: 1, "result": "" });
                    }
                });

            }, function (err) {
                cb(err, { status: 1, "result": "" });
            })

        }, function (err) {

        });

    }

    Patient.remoteMethod(
        'modifyUserInfo',
        {
            http: { verb: 'post' },
            description: '微信事件通知',
            accepts: [{ arg: 'q', type: 'object', http: { source: 'body' }, description: '{"sex":"1","age":"12","height":"120","weight":"25","mobile":"12345678"}' }
                // , {
                //     arg: 'token', type: 'string',
                //     http: function (ctx) {
                //         var req = ctx.req;
                //         return req.headers.token;
                //     },
                //     description: '{"token":""}'
                // }
            ],
            returns: { arg: 'UserInfo', type: 'object', root: true }
        }
    );


    Patient.ValidateWechatToken = function (req, res, cb) {

        var token = 'zqlzql';
        var q = req.query;
        var signature = q.signature; //微信加密签名  
        var nonce = q.nonce; //随机数  
        var timestamp = q.timestamp; //时间戳  
        var echostr = q.echostr; //随机字符串  

        EWTRACE('signature: ' + signature);
        EWTRACE('echostr: ' + echostr);
        EWTRACE('timestamp: ' + timestamp);
        EWTRACE('nonce: ' + nonce);
        var sha1 = require('sha1');

        var str = [timestamp + '', nonce + '', token].sort().join('');
        EWTRACE('加密前Str: ' + str);
        EWTRACE('加密后Str: ' + sha1(str));

        if (sha1(str) == signature) {

            res.writeHeader(200, { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' })
            res.write(new Buffer(echostr).toString("UTF-8"));
            res.end();
            EWTRACE('Send OK');

        } else {
            res.writeHeader(200, { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' })
            res.write(new Buffer("false").toString("UTF-8"));
            res.end();
            EWTRACE('Send OK');
        }
    };

    Patient.remoteMethod(
        'ValidateWechatToken',
        {
            http: { verb: 'get' },
            description: '微信服务器验证',
            accepts: [{
                arg: 'req', type: 'object',
                http: function (ctx) {
                    return ctx.req;
                },
                description: '{"token":""}'
            },
            {
                arg: 'res', type: 'object',
                http: function (ctx) {
                    return ctx.res;
                },
                description: '{"token":""}'
            }
            ],
            returns: { arg: 'echostr', type: 'number', root: true }

        }
    );


    Patient.ValidateWechatToken = function (req, res, cb) {

        var q = req.query;
        var openid = q.openid; //微信加密签名  

        if (!_.isEmpty(req.body.xml.event)) {

            if (req.body.xml.event[0] == 'subscribe' || req.body.xml.event[0] == 'SCAN') {
                regUser(req, res, cb);
                return;
            }

            if (req.body.xml.event[0] == 'unsubscribe') {
                unregUser(req, res, cb);
                return;
            }
        }
    };

    Patient.remoteMethod(
        'ValidateWechatToken',
        {
            http: { verb: 'post' },
            description: '微信服务器验证',
            accepts: [{
                arg: 'req', type: 'object',
                http: function (ctx) {
                    return ctx.req;
                },
                description: '{"token":""}'
            },
            {
                arg: 'res', type: 'object',
                http: function (ctx) {
                    return ctx.res;
                },
                description: '{"token":""}'
            }
            ],
            returns: { arg: 'echostr', type: 'number', root: true }

        }
    );



    function unregUser(req, res, cb) {

        var q = req.query;
        var openid = q.openid; //微信加密签名 

        var bsSQL = "update hh_publicUser set openid = '' where openid = '" + openid + "'";
        DoSQL(bsSQL).then(function (userResult) {

            cb(null, { status: 0, "result": "" });
        }, function (err) {
            cb(err, { status: 1, "result": "" });
        });
    };

    function regUser(req, res, cb) {

        var q = req.query;
        var openid = q.openid; //微信加密签名 
        var watch_iccid = req.body.xml.eventkey[0];
        if (watch_iccid.indexOf('_') > 0) {
            watch_iccid = watch_iccid.substr(watch_iccid.indexOf('_') + 1);
        }
        var tokenUrl = 'http://106.14.159.108:2567/token';
        var needle = require('needle');
        needle.get(encodeURI(tokenUrl), null, function (err, resp) {
            // you can pass params as a string or as an object.
            if (err) {
                //cb(err, { status: 0, "result": "" });
                EWTRACE(err.message);
                cb(err, { status: 1, "result": "" });
            }
            else {
                var url = "https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=" + resp.body.access_token;

                var SendData = {
                    "touser": openid,
                    "msgtype": "text",
                    "text":
                    {
                        "content": "欢迎加入曼康健康计划"
                    }
                };

                needle.post(encodeURI(url), SendData, { json: true }, function (err, resp) {
                    // you can pass params as a string or as an object.
                    if (err) {
                        //cb(err, { status: 0, "result": "" });
                        EWTRACE("Send WX Notify Error:" + err.message);
                    }
                    else {
                        EWTRACE("Send WX Notify OK!");
                        EWTRACE(JSON.stringify(resp.body));

                        var AddWatch = {};
                        AddWatch.iccid = watch_iccid;
                        AddWatch.nickName = 'new User';
                        AddWatch.sex = 1;
                        AddWatch.age = 1;
                        AddWatch.height = 1;
                        AddWatch.weight = 1;

                        var urlInfo = {"method":"registerUser.open"};
                        //CreateURL(urlInfo, false)
                        CreateURL(urlInfo)

                        needle.post(encodeURI(urlInfo.url), AddWatch, urlInfo.options, function (err, resp) {
                            // you can pass params as a string or as an object.
                            
                            if (err || resp.body.code != 0) {
                                //cb(err, { status: 0, "result": "" });
                                EWTRACEIFY(resp.body);
                                var bsSQL = "update hh_publicUser set openid ='" + openid + "' where iccid = '" + watch_iccid + "'";
                                DoSQL(bsSQL).then(function () {
                                    cb(null, { status: 0, "result": "" });
                                }, function (err) {
                                    cb(err, { status: 1, "result": "" });
                                });


                            }
                            else {
                                var bsSQL = "select * from hh_publicUser where openid = '" + openid + "'";
                                DoSQL(bsSQL).then(function (userResult) {
                                    if (userResult.length == 0) {
                                        bsSQL = "update hh_pubcliUser set watchuserid = '' where iccid = '" + watch_iccid + "';"
                                        bsSQL += "INSERT INTO hh_publicUser (id, openid, iccid, watchuserid) VALUES (uuid(),'" + openid + "','" + watch_iccid + "','" + resp.body.data.userId + "');";
                                    } else {
                                        bsSQL = "update hh_pubcliUser set watchuserid = '' where iccid = '" + watch_iccid + "';"
                                        bsSQL += "update hh_publicUser set iccid = '" + watch_iccid + "', watchuserid = '" + resp.body.data.userId + "' where openid ='" + openid + "'";
                                    }

                                    DoSQL(bsSQL).then(function () {
                                        cb(null, { status: 0, "result": "" });
                                    }, function (err) {
                                        cb(err, { status: 1, "result": "" });
                                    });
                                }, function (err) {
                                    cb(err, { status: 1, "result": "" });
                                });

                            }
                        });
                    }
                });
            }
        });
    }


    Patient.uploadPressureData = function (req, cb) {
        EWTRACE("uploadPressureData Begin");

        var appId = req.headers.appId;
        var appSecret = req.headers.appSecret;
        var sign = req.headers.sign;
        var rnd = req.query.rnd;
        var body = req.body;

        EWTRACE("appId:"+appId);
        EWTRACE("appSecret:"+appSecret);
        EWTRACE("sign:"+sign);
        EWTRACE("rnd:"+rnd);
        EWTRACEIFY(body);

        var localSign = CreateMD5(rnd);
        
        if ( localSign.toUpperCase() == sign.toUpperCase() ){

            var bsSQL = "select openid from hh_publicuser where iccid = '" +body.iccid+ "'";
            DoSQL(bsSQL).then(function(UserInfo){

                if ( UserInfo.length == 0 ){
                    cb(null, { status: 1, "result": "" }); 
                    return;
                }

                bsSQL = "insert into hh_userwatchdata(iccid,openid,sn,highpress,lowpress,hrcount,anb,pwv,absoluterisk,relativerisk,testtime,addtime) values('"+body.iccid+"','"+UserInfo[0].openid+"','"+body.sn+"',"+body.highPress+","+body.lowPress+","+body.hrCount+","+body.anb+","+body.pwv+","+body.absoluteRisk+","+body.relativeRisk+",'"+body.testTime+"',unix_timestamp(now()));";

                DoSQL(bsSQL).then(function(){
                    cb(null, { code: 0, "message": "operate success" });
                },function(err){
                    cb(null, { code: -1, "message": err.message }); 
                })

                
            },function(err){
                cb(err, { code: -1, "message": err.message }); 
            })
        }
        else{
            cb(null, { code: 1001, "message": "数字签名错误，appId未授权" }); 
        }
    }
        

    Patient.remoteMethod(
        'uploadPressureData',
        {
            http: { verb: 'post' },
            description: '微信事件通知',
            accepts: {
                arg: 'req', type: 'object',
                http: function (ctx) {
                    return ctx.req;
                },
                description: '{"req":""}'
            },
            returns: { arg: 'UserInfo', type: 'object', root: true }
        }
    );    
};




// Patient.ValidateWechatToken = function (req, res, cb) {

//             var token = 'zqlzql';
//             var q = req.query;  
//             var signature = q.signature; //微信加密签名  
//             var nonce = q.nonce; //随机数  
//             var timestamp = q.timestamp; //时间戳  
//             var echostr = q.echostr; //随机字符串  

//             EWTRACE('signature: ' + signature);
//             EWTRACE('echostr: ' + echostr);
//             EWTRACE('timestamp: ' + timestamp);
//             EWTRACE('nonce: ' + nonce);
//             var sha1 = require('sha1');

//             var str = [timestamp + '', nonce + '', token].sort().join('');
//             EWTRACE('加密前Str: ' + str);
//             EWTRACE('加密后Str: ' + sha1(str));

//             if (sha1(str) == signature) {

//                 res.writeHeader(200, { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' })
//                 res.write(new Buffer(echostr).toString("UTF-8"));
//                 res.end();
//                 EWTRACE('Send OK');
//             } else {
//                 res.end("false");
//                 //cb(null, echostr, 'text/xml; charset=utf-8');
//             }
//         };

//         Patient.remoteMethod(
//             'ValidateWechatToken',
//             {
//                 http: { verb: 'get' },
//                 description: '微信服务器验证',
//                 accepts: [{
//                     arg: 'req', type: 'object',
//                     http: function (ctx) {
//                         return ctx.req;
//                     },
//                     description: '{"token":""}'
//                 },
//                 {
//                     arg: 'res', type: 'object',
//                     http: function (ctx) {
//                         return ctx.res;
//                     },
//                     description: '{"token":""}'
//                 }
//                 ],
//                 returns: { arg: 'echostr', type: 'number', root: true }
//             }
//         );