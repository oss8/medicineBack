'use strict';

module.exports = function (Watch) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Watch);
    var _ = require('underscore');
    var uuid = require('node-uuid');
    var needle = require('needle');
    var config = require('../../config/config')

    Watch.CreateWXMenu_dangtang = function (cb) {
        EWTRACE("CreateWXMenu Begin");

        Request_WxToken_dangtang().then(function (resp) {

            var data = config.menu; 5
            var url = "https://api.weixin.qq.com/cgi-bin/get_current_selfmenu_info?access_token=" + resp.body.access_token;

            needle.post(encodeURI(url), data, { json: true }, function (err, resp1) {
                // you can pass params as a string or as an object.
                if (err) {
                    //cb(err, { status: 0, "result": "" });
                    EWTRACE(err.message);
                    cb(err, { status: 1, "result": "" });
                }
                else {
                    resp1.body.selfmenu_info.button[1].sub_button.list[1].url = "http://wp.eshine.cn/auth/wechat?bu=http%3a%2f%2falliance.eshine.cn%2f%23%2f%3ftoken%3ddasd&brandid=100230&wpdomain=wp.eshine.cn";

                    var data = resp1.body.selfmenu_info;
                    var url = "https://api.weixin.qq.com/cgi-bin/menu/create?access_token=" + resp.body.access_token;

                    needle.post(encodeURI(url), data, { json: true }, function (err, resp) {
                        cb(null, { status: 0, "result": resp.body });
                    });
                }
            });
        }, function (err) {
            cb(err, { status: 1, "result": "" });
        });
        EWTRACE("CreateWXMenu End");
    }

    Watch.remoteMethod(
        'CreateWXMenu_dangtang',
        {
            http: { verb: 'post' },
            description: '创建微信菜单',
            returns: { arg: 'AddDoctor', type: 'object', root: true }
        }
    );



    Watch.CreateWXMenu = function (cb) {
        EWTRACE("CreateWXMenu Begin");

        Request_WxToken().then(function (resp) {

            var data = config.menu;
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
        EWTRACE("CreateWXMenu End");
    }

    Watch.remoteMethod(
        'CreateWXMenu',
        {
            http: { verb: 'post' },
            description: '创建微信菜单',
            returns: { arg: 'AddDoctor', type: 'object', root: true }
        }
    );

    Watch.RequestUserInfo = function (OpenID, cb) {
        EWTRACE("RequestUserInfo Begin");

        var _openid = OpenID.openid;

        var ps = [];
        var bsSQL = "select name,sex,birthday,height,weight,mobile,cardNo,disease_list as disease from hh_publicuser where openid = '" + _openid + "'";
        var userInfo = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, userInfo));

        bsSQL = "select followopenid,nickname,tel,ecc,headimage from hh_familyuser where openid = '" + _openid + "'";
        var myfollow = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, myfollow));

        Promise.all(ps).then(function () {

            userInfo.Result[0].followList = myfollow.Result;
            userInfo.Result[0].disease_list = JSON.parse(userInfo.Result[0].disease);

            delete userInfo.Result[0].disease;

            cb(null, { status: 1, "result": userInfo.Result[0] });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }


    Watch.remoteMethod(
        'RequestUserInfo',
        {
            http: { verb: 'post' },
            description: '获取用户信息',
            accepts:
            {
                arg: 'OpenID', type: 'object',
                http: function (ctx) {
                    var req = ctx.req;
                    return GetOpenIDFromToken(req.headers.token);
                },
                description: '{"OpenID":""}'
            }
            ,
            returns: { arg: 'UserInfo', type: 'object', root: true }
        }
    );


    Watch.ModifyUserInfo = function (p, OpenID, cb) {
        EWTRACE("ModifyUserInfo Begin");

        var _openid = OpenID.openid;

        var bsSQL = "update hh_publicuser set ";
        var fieldContext = "";
        fieldContext += fillUpdateSQL(p, 'name');
        fieldContext += fillUpdateSQL(p, 'sex');
        fieldContext += fillUpdateSQL(p, 'birthday');
        fieldContext += fillUpdateSQL(p, 'height');
        fieldContext += fillUpdateSQL(p, 'weight');
        fieldContext += fillUpdateSQL(p, 'mobile');
        fieldContext += fillUpdateSQL(p, 'cardNo');
        if (!_.isUndefined(p.disease_list)) {
            fieldContext += " disease_list = '" + JSON.stringify(p.disease_list) + "' ,";
        }

        var age = 0;
        if (!_.isUndefined(p.birthday)) {
            age = GetDateDiff(p.birthday, (new Date()).format('yyyy-MM-dd'), 'year');
            fieldContext += " age = " + age + ",";
        }

        fieldContext = fieldContext.substr(0, fieldContext.length - 1);

        bsSQL += fieldContext + " where openid = '" + _openid + "'";

        DoSQL(bsSQL).then(function () {

            cb(null, { status: 1, "result": "" });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }


    Watch.remoteMethod(
        'ModifyUserInfo',
        {
            http: { verb: 'post' },
            description: '用户编辑信息',
            accepts: [{ arg: 'p', type: 'object', http: { source: 'body' }, description: '{"name":"葛岭","sex":1,"birthday":"1974-02-11","height":"178","weight":"62","mobile":"18958064659","cardNo":"330102197420111536","disease_list":{}}' },
            {
                arg: 'OpenID', type: 'object',
                http: function (ctx) {
                    var req = ctx.req;
                    return GetOpenIDFromToken(req.headers.token);
                },
                description: '{"OpenID":""}'
            }
            ],
            returns: { arg: 'UserInfo', type: 'object', root: true }
        }
    );




    Watch.RequestMyQRCode = function (OpenID, cb) {
        EWTRACE("RequestMyQRCode Begin");
        var _openid = OpenID.openid;

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
                arg: 'OpenID', type: 'object',
                http: function (ctx) {
                    var req = ctx.req;
                    return GetOpenIDFromToken(req.headers.token);
                },
                description: '{"OpenID":""}'
            },
            returns: { arg: 'p', type: 'object', root: true }
        }
    );


    Watch.ModifyFollowInfo = function (followInfo, OpenID, cb) {
        EWTRACE("ModifyFollowInfo Begin");
        var _openid = OpenID.openid;

        var bsSQL = "update hh_familyuser set ";
        var fileds = "";
        fileds += fillUpdateSQL(followInfo, 'nickname');
        fileds += fillUpdateSQL(followInfo, 'ecc');
        fileds += fillUpdateSQL(followInfo, 'tel');
        fileds = fileds.substr(0, fileds.length - 1);


        bsSQL += fileds + " where openid = '" + _openid + "' and followopenid = '" + followInfo.followOpenid + "'";

        DoSQL(bsSQL).then(function () {
            cb(null, { status: 1, "result": "" });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        })

        EWTRACE("ModifyFollowInfo End");
    }

    Watch.remoteMethod(
        'ModifyFollowInfo',
        {
            http: { verb: 'post' },
            description: '编辑亲友信息',
            accepts: [{ arg: 'followInfo', http: { source: 'body' }, type: 'object', description: '{"followOpenid":"","nickname":"","tel":"","ecc":""}' },
            {
                arg: 'OpenID', type: 'object',
                http: function (ctx) {
                    var req = ctx.req;
                    return GetOpenIDFromToken(req.headers.token);
                },
                description: '{"OpenID":""}'
            }],
            returns: { arg: 'p', type: 'object', root: true }
        }
    );


    Watch.removeFollow = function (followInfo, OpenID, cb) {
        EWTRACE("removeFollow Begin");
        var _openid = OpenID.openid;

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
            http: { verb: 'post' },
            description: '编辑亲友信息',
            accepts: [{ arg: 'followInfo', http: { source: 'body' }, type: 'object', description: '{"followOpenid":""}' }, {
                arg: 'OpenID', type: 'object',
                http: function (ctx) {
                    var req = ctx.req;
                    return GetOpenIDFromToken(req.headers.token);
                },
                description: '{"OpenID":""}'
            }],
            returns: { arg: 'p', type: 'object', root: true }
        }
    );

    Watch.reqeustFollow = function (OpenID, cb) {
        EWTRACE("reqeustFollow Begin");
        var _openid = OpenID.openid;

        var bsSQL = "select * from hh_familyuser  where openid = '" + _openid + "'";

        DoSQL(bsSQL).then(function (result) {
            cb(null, { status: 1, "result": result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        })

        EWTRACE("reqeustFollow End");
    }

    Watch.remoteMethod(
        'reqeustFollow',
        {
            http: { verb: 'get' },
            description: '查询亲友信息',
            accepts: {
                arg: 'OpenID', type: 'object',
                http: function (ctx) {
                    var req = ctx.req;
                    return GetOpenIDFromToken(req.headers.token);
                },
                description: '{"OpenID":""}'
            },
            returns: { arg: 'p', type: 'object', root: true }
        }
    );

    Watch.RequestUserMonitor = function (p, cb) {
        EWTRACE("RequestUserMonitor Begin");

        var _openid = "oFVZ-1Mf3yxWLWHQPE_3BhlVFnGU";

        // if (_.isUndefined(p.followOpenid)) {
        //     _openid = OpenID.openid;
        // }
        // else {
        //     _openid = p.followOpenid;
        // }


        var ps = [];
        var bsSQL = "SELECT iccid,openid,sn,highpress,lowpress,hrcount,anb,pwv,absoluterisk,relativerisk,testtime,  DATE_FORMAT(addtime,'%Y-%m-%d') as addtime,trackid,addtime2 FROM hh_userwatchdata where openid = '" + _openid + "' order by addtime desc";
        var _watchdata = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _watchdata));

        bsSQL = "SELECT userid,openid,belongdate,walknum,runnum,mileage,caloric,deepsleep,lightsleep,noadorn,sober,DATE_FORMAT(addtime,'%Y-%m-%d') as addtime, addtime as testtime FROM hh_usersportdata where openid = '" + _openid + "' order by addtime desc";
        var _sportdata = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _sportdata));

        Promise.all(ps).then(function () {

            var _result = {};
            // _result.watchDetail = _.sortBy(_watchdata.Result, function (fitem) {
            //     return -1 * fitem.addtime;
            // });;
            // _result.sportDetail = _.sortBy(_sportdata.Result, function (fitem) {
            //     return -1 * fitem.addtime;
            // });
            _result.pwv = [];
            _result.pressure = [];
            _result.heartrate = [];
            _result.walk = [];
            _result.sleep = [];


            for (var i = 0; i < 7; i++) {

                var curDate = GetDateAdd((new Date()).format('yyyy-MM-dd'), -1 * i, 'day').format('yyyy-MM-dd');

                var _filter = _.filter(_watchdata.Result, function (fitem) {
                    return fitem.addtime == curDate;
                });

                _filter.forEach(function (item) {
                    if (_.isEmpty(_filter)) {
                        var dayData = {};
                        dayData.date = curDate;
                        dayData.addtime = curDate;
                        dayData.value = 0;

                        _result.pwv.push(dayData);
                        _result.pressure.push(dayData);
                        _result.heartrate.push(dayData);

                    } else {
                        var dayData = {};
                        dayData.date = curDate;
                        dayData.value = item.pwv;
                        dayData.addtime = item.testtime;
                        _result.pwv.push(dayData);

                        var pressure = {};
                        pressure.date = curDate;
                        pressure.addtime = item.testtime;
                        pressure.high = item.highpress;
                        pressure.low = item.lowpress;
                        _result.pressure.push(pressure);

                        var heartrate = {};
                        heartrate.date = curDate;
                        heartrate.addtime = item.testtime;
                        heartrate.value = item.hrcount;
                        _result.heartrate.push(heartrate);
                    }
                })


                var _find = _.find(_sportdata.Result, function (fitem) {
                    return fitem.addtime == curDate;
                });

                if (!_.isUndefined(_find)) {
                    var walk = {};
                    walk.date = curDate;
                    walk.addtime = item.testtime;
                    walk.value = find.walknum;
                    _result.walk.push(walk);

                    var sleep = {};
                    sleep.date = curDate;
                    sleep.addtime = item.testtime;
                    sleep.deepsleep = find.deepsleep;
                    sleep.lightsleep = find.lightsleep;
                    _result.walk.push(sleep);
                }
                else {
                    var dayData = {};
                    dayData.date = curDate;
                    dayData.addtime = curDate;
                    dayData.value = 0;
                    _result.walk.push(dayData);
                    _result.sleep.push(dayData);
                }
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
            accepts: [{ arg: 'p', http: { source: 'body' }, type: 'object', description: '{"followopenid":""}' },
                // {
                //     arg: 'OpenID', type: 'object',
                //     http: function (ctx) {
                //         var req = ctx.req;
                //         return GetOpenIDFromToken(req.headers.token);
                //     },
                //     description: '{"OpenID":""}'
                // }
            ],
            returns: { arg: 'UserInfo', type: 'object', root: true }
        }
    );


    Watch.reqeustDemoToken = function (cb) {

        var token = {
            subscribe: 1,
            openid: 'oFVZ-1Mf3yxWLWHQPE_3BhlVFnGU',
            nickname: '路人甲',
            sex: 1,
            language: 'zh_CN',
            city: '杭州',
            province: '浙江',
            country: '中国',
            headimgurl: 'http://wx.qlogo.cn/mmopen/SYeWkon6C6L4uAdUCBgCHs6oaicvlgEfnf3LLC0D4ibLTZyic1f2icMv1xF2K45xaVNJ0NuECFWUqyXsAUx9fJmIy13jHEpSAgGO/0',
            subscribe_time: 1503563590,
            unionid: 'oBQ4y01s_iPdv-NqE8zonMYFfuus',
            remark: '',
            groupid: 0,
            tagid_list: []
        };

        var result = {};
        GetTokenFromOpenID(result, token).then(function (result) {

            cb(null, { status: 1, "result": result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        })

        EWTRACE("removeFollow End");
    }

    Watch.remoteMethod(
        'reqeustDemoToken',
        {
            http: { verb: 'get' },
            description: '获取测试token',
            returns: { arg: 'p', type: 'object', root: true }
        }
    );


    Watch.requestToken = function (token, cb) {

        var OpenID = GetOpenIDFromToken(token);
        var _result = {};
        GetTokenFromOpenID(_result, OpenID).then(function (result) {

            cb(null, { status: 1, "result": result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        })

        EWTRACE("removeFollow End");
    }

    Watch.remoteMethod(
        'requestToken',
        {
            http: { verb: 'get' },
            description: '获取测试token',
            accepts: {
                arg: 'token', type: 'object',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            },            
            returns: { arg: 'p', type: 'object', root: true }
        }
    );
};




