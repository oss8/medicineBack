'use strict';

module.exports = function (Baseservice) {

    var app = require('../../server/server');
    app.DisableSystemMethod(Baseservice);
    var _ = require('underscore');

    Baseservice.CreateWechatQRCode = function (p, cb) {
        EWTRACE("CreateWechatQRCode:"+p);
        var tokenUrl = 'http://106.14.159.108:3000/token';
        var needle = require('needle');
        needle.get(encodeURI(tokenUrl), null, function (err, resp) {
            // you can pass params as a string or as an object.
            if (err) {
                //cb(err, { status: 0, "result": "" });
                EWTRACE(err.message);
                cb(err, { status: 1, "result": "" });
            }
            else {
                var pp = { "expire_seconds": 604800, "action_name": "QR_STR_SCENE", "action_info": { "scene": { "scene_str": p } } };
                var url = "https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=" + resp.body.access_token;
                needle.post(encodeURI(url), pp, { json: true }, function (err, resp) {
                    // you can pass params as a string or as an object.
                    if (err) {
                        //cb(err, { status: 0, "result": "" });
                        EWTRACE(err.message);
                        cb(err, { status: 0, "result": "" });
                    }
                    else {
                        EWTRACEIFY(resp.body);
                        EWTRACE(resp.body.url);
                        cb(null, { status: 1, "result": resp.body.url });
                    }
                });
            }
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



