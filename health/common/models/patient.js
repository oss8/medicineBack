'use strict';

module.exports = function (Patient) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Patient);
    var _ = require('underscore');
    var uuid = require('node-uuid');
    var needle = require('needle');


    Patient.WX_PostEvent = function (a, cb) {
        EWTRACE("WX_PostEvent Begin");


        if (a.xml.event[0] == "subscribe" || a.xml.event[0] == "SCAN") {
            var createWatch = {};
            createWatch.openId = a.xml.fromusername;
            createWatch.iccid = 'aaaaaaaaaaa';//a.xml.eventkey;
            regUser(createWatch);
        }
        var backXml = '<xml xmlns="eshine"><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[]]></return_msg></xml>';
        cb(null, backXml, 'text/xml; charset=utf-8');
    }

    Patient.remoteMethod(
        'WX_PostEvent',
        {
            http: { verb: 'post' },
            description: '微信事件通知',
            accepts: {
                arg: 'a',
                type: 'xml',
                root: true,
                description: "wx-pay-back",
                http: { source: 'body' }
            },
            returns: { arg: 'AddDoctor', type: 'object', root: true }
        }
    );


    Patient.WX_PostEvent = function (a, cb) {
        EWTRACE("WX_PostEvent Begin");


        if (a.xml.event[0] == "subscribe" || a.xml.event[0] == "SCAN") {
            var createWatch = {};
            createWatch.openId = a.xml.fromusername;
            createWatch.iccid = 'aaaaaaaaaaa';//a.xml.eventkey;
            regUser(createWatch);
        }
        var backXml = '<xml xmlns="eshine"><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[]]></return_msg></xml>';
        cb(null, backXml, 'text/xml; charset=utf-8');
    }



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

    function regUser(AddWatch) {
        require('dotenv').config({ path: './config/.env' });
        var url = process.env.REQUEST_WATCH_URL + "registerUser.open";


        AddWatch.nickName = 'new User';
        AddWatch.sex = 2;
        AddWatch.age = 1;
        AddWatch.height = 1;
        AddWatch.weight = 1;

        needle.post(encodeURI(url), AddWatch, { json: true }, function (err, resp) {
            // you can pass params as a string or as an object.
            if (err) {
                //cb(err, { status: 0, "result": "" });
                EWTRACE(err.message);
            }
            else {
                EWTRACEIFY(resp.body.data);
            }
        });
    }
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