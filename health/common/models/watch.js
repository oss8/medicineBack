'use strict';

module.exports = function(Watch) {
    var app = require('../../server/server');    
    app.DisableSystemMethod(Watch);
    var _ = require('underscore');
    var uuid = require('node-uuid');
    var needle = require('needle');

    Watch.RegWatchUser = function (AddWatch,token, cb) {
        EWTRACE("RegWatchUser Begin");

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.openId;
        } catch (err) {
            cb(null, { status: 403, "result": "" });
            return;
        }

        AddWatch.nickName = OpenID.nickname;
        AddWatch.sex = OpenID.sex;
        AddWatch.age = 1;
        AddWatch.height = 1;
        AddWatch.weight = 1;

        require('dotenv').config({ path: './config/.env' });
        url = process.env.REQUEST_WATCH_URL + "registerUser.open";

        needle.post(encodeURI(url), AddWatch, { json: true }, function (err, resp) {
            // you can pass params as a string or as an object.
            if (err) {
                //cb(err, { status: 0, "result": "" });
                EWTRACE(err.message);
            }
            else {
                EWTRACEIFY(resp.body);
            }
        });
    }

    Watch.remoteMethod(
        'RegWatchUser',
        {
            http: { verb: 'post' },
            description: '添加患者手表',
            accepts: [{ arg: 'AddWatch', type: 'object', description: '{"iccid":""}' },
            {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }],            
            returns: { arg: 'AddDoctor', type: 'object', root: true }
        }
    );    

};
