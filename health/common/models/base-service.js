/*
 * @Author: summer.ge 
 * @Date: 2017-08-24 13:44:24 
 * @Last Modified by: summer.ge
 * @Last Modified time: 2017-08-24 20:14:07
 */
'use strict';

module.exports = function (Baseservice) {

    var app = require('../../server/server');
    app.DisableSystemMethod(Baseservice);
    var _ = require('underscore');
    var needle = require('needle');

    Baseservice.CreateWechatQRCode = function (p, cb) {
        EWTRACE("CreateWechatQRCode:" + p);

        Request_WxToken().then(function (resp) {
            var pp = { "expire_seconds": 604800, "action_name": "QR_STR_SCENE", "action_info": { "scene": { "scene_str": p } } };
            var url = "https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=" + resp.body.access_token;
            needle.post(encodeURI(url), pp, { json: true }, function (err, resp) {
                // you can pass params as a string or as an object.
                if (err) {
                    EWTRACE(err.message);
                    cb(err, { status: 0, "result": "" });
                }
                else {
                    EWTRACEIFY(resp.body);
                    EWTRACE(resp.body.url);
                    cb(null, { status: 1, "result": resp.body.url });
                }
            });
        }, function (err) {
            EWTRACE(err.message);
            cb(err, { status: 0, "result": "" });
        });

        EWTRACE("CreateWechatQRCode");
    }

    Baseservice.remoteMethod(
        'CreateWechatQRCode',
        {
            http: { verb: 'get' },
            description: '生成公众号二维码',
            accepts: { arg: 'iccid', type: 'string', description: '898602b11816c0389700' },
            returns: { arg: 'p', type: 'object', root: true }
        }
    );



};



