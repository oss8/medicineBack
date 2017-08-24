'use strict';

module.exports = function (Watch) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Watch);
    var _ = require('underscore');
    var uuid = require('node-uuid');
    var needle = require('needle');

    Watch.CreateWXMenu = function (cb) {
        EWTRACE("CreateWXMenu Begin");

        Request_WxToken().then(function (resp) {

            var data = {
                "button": [
                    {
                        "name": "我的",
                        "sub_button": [
                            {
                                "type": "view",
                                "name": "个人信息",
                                "url": "http://www.soso.com/"
                            },
                            {
                                "type": "view",
                                "name": "设备绑定",
                                "url": "http://v.qq.com/"
                            },
                            {
                                "type": "view",
                                "name": "初学者教学",
                                "url": "http://v.qq.com/"
                            },
                            {
                                "type": "view",
                                "name": "联系客服",
                                "url": "http://v.qq.com/"
                            },
                            {
                                "type": "view",
                                "name": "认识PWV",
                                "url": "http://v.qq.com/"
                            },
                        ]
                    },
                    {
                        "name": "健康档案",
                        "sub_button": [
                            {
                                "type": "view",
                                "name": "历史数据",
                                "url": "http://www.soso.com/"
                            },
                            {
                                "type": "view",
                                "name": "健康报告",
                                "url": "http://v.qq.com/"
                            },
                            {
                                "type": "view",
                                "name": "健康之道",
                                "url": "http://v.qq.com/"
                            }
                        ]
                    },
                    {
                        "type": "click",
                        "name": "SOS",
                        "key": "SOS_Notify"
                    }
                ]
            }

            var url = "https://api.weixin.qq.com/cgi-bin/menu/create?access_token=" + resp.body.access_token;

            needle.post(encodeURI(url), data, { json: true }, function (err, resp) {
                // you can pass params as a string or as an object.
                if (err) {
                    //cb(err, { status: 0, "result": "" });
                    EWTRACE(err.message);
                    cb(err, { status: 1, "result": "" });
                }
                else {
                    cb(null, { status: 0, "result": resp.body });
                }
            });
        }, function (err) {
            cb(err, { status: 1, "result": "" });
        });
    }

    Watch.remoteMethod(
        'CreateWXMenu',
        {
            http: { verb: 'post' },
            description: '创建微信菜单',
            returns: { arg: 'AddDoctor', type: 'object', root: true }
        }
    );

    Watch.RequestUserInfo = function (token, cb) {
        EWTRACE("RequestUserInfo Begin");

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.openId;
        } catch (err) {
            cb(null, { status: 403, "result": "" });
            return;
        }
        _openid = OpenID.openid;

        var ps = [];
        var bsSQL = "select name,sex,birthday,height,weight,mobile,cardNo,disease_list from hh_publicuser where openid = '" + _openid + "'";
        var userInfo = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, userInfo));

        bsSQL = "select openid,followopenid,name,tel,ecc from hh_familyuser where openid = '" + _openid + "'";
        var myfollow = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, myfollow));

        Promise.all(ps).then(function () {

            userInfo.Result[0].followList = myfollow.Result;
            userInfo.Result[0].disease = JSON.parse(userInfo.Result[0].disease_list);

            delete userInfo.Result[0].disease_list;

            cb(null, { status: 0, "result": userInfo.Result[0] });
        }, function (err) {
            cb(err, { status: 1, "result": "" });
        });
    }


    Watch.remoteMethod(
        'RequestUserInfo',
        {
            http: { verb: 'post' },
            description: '用户登录',
            accepts:
            {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }
            ,
            returns: { arg: 'UserInfo', type: 'object', root: true }
        }
    );


    Watch.ModifyUserInfo = function (p, cb) {
        EWTRACE("ModifyUserInfo Begin");

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.openid;            
        } catch (err) {
            cb(null, { status: 1, "result": "" });
            return;
        }


        var bsSQL = "update hh_publicuser set ";
        var fieldContext = "";
        if (!_.isUndefined(p.name)) {
            fieldContext += " name = '" + p.name + "',";
        }
        if (!_.isUndefined(p.sex)) {
            fieldContext += " sex = '" + p.sex + "',";
        }
        if (!_.isUndefined(p.birthday)) {
            fieldContext += " birthday = '" + p.birthday + "',";
        }
        if (!_.isUndefined(p.height)) {
            fieldContext += " height = '" + p.height + "',";
        }
        if (!_.isUndefined(p.weight)) {
            fieldContext += " weight = '" + p.weight + "',";
        }
        if (!_.isUndefined(p.mobile)) {
            fieldContext += " mobile = '" + p.mobile + "',";
        }
        if (!_.isUndefined(p.cardNo)) {
            fieldContext += " cardNo = '" + p.cardNo + "',";
        }
        if (!_.isUndefined(p.disease_list)) {
            fieldContext += " disease_list = '" + JSON.stringify(p.disease_list) + "' ,";
        }

        var age = GetDateDiff(p.birthday, (new Date()).format('yyyy-MM-dd'), 'year');
        fieldContext += " age = " + age;

        bsSQL += fieldContext + " where openid = '" + _openid + "'";

        DoSQL(bsSQL).then(function () {

            cb(null, { status: 0, "result": "" });
        }, function (err) {
            cb(err, { status: 1, "result": "" });
        });
    }


    Watch.remoteMethod(
        'ModifyUserInfo',
        {
            http: { verb: 'post' },
            description: '用户编辑信息',
            accepts: [{ arg: 'p', type: 'object', description: '{"name":"葛岭","sex":1,"birthday":"1974-02-11","height":"178","weight":"62","mobile":"18958064659","cardNo":"330102197420111536","disease_list":{}}' },
            {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }
            ],
            returns: { arg: 'UserInfo', type: 'object', root: true }
        }
    );


    Watch.RequestMyQRCode = function (token, cb) {

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.openId;
        } catch (err) {
            cb(null, { status: 403, "result": "" });
            return;
        }

        EWTRACE("RequestMyQRCode:" + _openid);
        Request_WxToken().then(function (resp) {
            var family = 'family_' + _openid;
            var pp = { "expire_seconds": 604800, "action_name": "QR_STR_SCENE", "action_info": { "scene": { "scene_str": family } } };
            var url = "https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=" + resp.body.access_token;
            needle.post(encodeURI(url), pp, { json: true }, function (err, resp) {
                // you can pass params as a string or as an object.
                if (err) {
                    //cb(err, { status: 0, "result": "" });
                    EWTRACE(err.message);
                    cb(err, { status: 0, "result": "" });
                }
                else {
                    EWTRACE(resp.body.url);
                    cb(null, { status: 1, "result": resp.body.url });
                }
            });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });

        EWTRACE("RequestMyQRCode End");
    }

    Watch.remoteMethod(
        'RequestMyQRCode',
        {
            http: { verb: 'get' },
            description: '生成我的二维码',
            accepts: {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            },
            returns: { arg: 'p', type: 'object', root: true }
        }
    );


    Watch.ModifyFollowInfo = function (followInfo, token, cb) {

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.openId;
        } catch (err) {
            cb(null, { status: 403, "result": "" });
            return;
        }

        var bsSQL = "update hh_familyuser set ";
        var fileds = "";
        if (!_.isUndefined(followInfo.nickName)) {
            fileds += " nickName = '" + followInfo.nickName + "',";
        }
        if (!_.isUndefined(followInfo.ecc)) {
            fileds += " ecc = '" + followInfo.ecc + "',";
        }
        if (!_.isUndefined(followInfo.tel)) {
            fileds += " tel = '" + followInfo.tel + "',";
        }
        if (fileds.length > 0) {
            fileds = fileds.substr(0, fileds.length - 1);
        }

        bsSQL += fileds + " where openid = '" + _openid + "' and followopenid = '" + followInfo.followOpenid + "'";

        DoSQL(bsSQL).then(function () {
            cb(null, { status: 1, "result": "" });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        })

        EWTRACE("RequestMyQRCode End");
    }

    Watch.remoteMethod(
        'ModifyFollowInfo',
        {
            http: { verb: 'get' },
            description: '编辑亲友信息',
            accepts: [{ arg: 'followInfo', type: 'object', description: '{"followOpenid":"","nickName":"","tel":"","ecc":""}' }, {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }],
            returns: { arg: 'p', type: 'object', root: true }
        }
    );


    Watch.removeFollow = function (followInfo, token, cb) {

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.openId;
        } catch (err) {
            cb(null, { status: 1, "result": "" });
            return;
        }

        var bsSQL = "delete from hh_familyuser  where openid = '" + _openid + "' and followopenid = '" + followInfo.followOpenid + "'";

        DoSQL(bsSQL).then(function () {
            cb(null, { status: 1, "result": "" });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        })

        EWTRACE("removeFollow End");
    }

    Watch.remoteMethod(
        'removeFollow',
        {
            http: { verb: 'get' },
            description: '编辑亲友信息',
            accepts: [{ arg: 'followInfo', type: 'object', description: '{"followOpenid":"","nickName":"","tel":"","ecc":""}' }, {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }],
            returns: { arg: 'p', type: 'object', root: true }
        }
    );

    Watch.RequestUserMonitor = function (p, token, cb) {
        EWTRACE("RequestUserMonitor Begin");

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.openId;
        } catch (err) {
            cb(null, { status: 403, "result": "" });
            return;
        }
        if (_.isUndefined(p.followOpenid)) {
            _openid = OpenID.openid;
        }
        else {
            _openid = p.followOpenid;
        }


        var ps = [];
        var bsSQL = "SELECT iccid,openid,sn,highpress,lowpress,hrcount,anb,pwv,absoluterisk,relativerisk,testtime,date_format(addtime, '%Y-%m-%d') as addtime,trackid,addtime2 FROM hh_userwatchdata where openid = '" + _openid + "' order by addtime desc";
        var _watchdata = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _watchdata));

        bsSQL = "SELECT userid,openid,belongdate,walknum,runnum,mileage,caloric,deepsleep,lightsleep,noadorn,sober,date_format(addtime, '%Y-%m-%d') as addtime FROM hh_usersportdata where openid = '" + _openid + "' order by addtime desc";
        var _sportdata = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _sportdata));

        Promise.all(ps).then(function () {

            var _result = {};
            _result.watchDetail = _.sortBy(_watchdata.Result, function (fitem) {
                return -1 * fitem.addtime;
            });;
            _result.sportDetail = _.sortBy(_sportdata.Result, function (fitem) {
                return -1 * fitem.addtime;
            });
            _result.dayList = [];

            for (var i = 0; i < 7; i++) {

                var curDate = GetDateAdd((new Date()).format('yyyy-MM-dd'), -1 * i, 'day').format('yyyy-MM-dd');

                var dayData = {};
                dayData.index = i;
                dayData.date = curDate;

                var _filter = _.filter(_watchdata.Result, function (fitem) {
                    return fitem.addtime == curDate;
                });

                var _watch = _.sortBy(_filter, function (fitem) {
                    return -1 * fitem.addtime2;
                })
                dayData.watch = {};

                if (_.isEmpty(_filter)) {
                    dayData.watch.dispData = {};
                } else {
                    dayData.watch.dispData = _watch[0];
                }

                dayData.sport = {};
                var _find = _.find(_sportdata.Result, function (fitem) {
                    return fitem.addtime == curDate;
                });

                if (!_.isUndefined(_find)) {
                    dayData.sport.dispData = _find;
                }
                else {
                    dayData.sport.dispData = {};
                }
                _result.dayList.push(dayData);
            }
            cb(null, { status: 0, "result": _result });

        }, function (err) {
            cb(err, { status: 1, "result": "" });
        });
    }


    Watch.remoteMethod(
        'RequestUserMonitor',
        {
            http: { verb: 'post' },
            description: '查询用户检测数据',
            accepts: [{ arg: 'p', type: 'object', description: '{"followopenid":""}' },
            {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }],
            returns: { arg: 'UserInfo', type: 'object', root: true }
        }
    );
};
