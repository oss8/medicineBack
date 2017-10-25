'use strict';

module.exports = function (Watch) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Watch);
    var _ = require('underscore');
    var uuid = require('node-uuid');
    var needle = require('needle');
    var config = require('../../config/config')


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

    var iconv = require("iconv-lite");
    Watch.requestMediaList = function (cb) {
        EWTRACE("requestMediaList Begin");

        Request_WxToken().then(function (resp) {

            var data = {
                "type": "news",
                "offset": 0,
                "count": 20
            };
            var url = "https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=" + resp.body.access_token;

            EWTRACE(url);
            needle.post(encodeURI(url), JSON.stringify(data), { 'Content-Type': 'text/plain' }, function (err, mediaList) {
                // you can pass params as a string or as an object.
                if (err) {
                    //cb(err, { status: 0, "result": "" });
                    EWTRACE(err.message);
                    cb(err, { status: 1, "result": "" });
                }
                else {
                    var aa = data = iconv.decode(mediaList.body, 'utf-8');
                    var mediaList = JSON.parse(aa);

                    var find = _.find(mediaList.item, function (fitem) {
                        return fitem.media_id == "YEZ1-hX2SqhxIoTprsAbGlId8YsyLrjkOJ1pKbx3uEM";
                    })

                    var data1 = {
                        "touser": '',
                        "msgtype": "news",
                        "news": {
                            "articles": []
                        }
                    }

                    find.content.news_item.forEach(function (fitem) {
                        var obj = {
                            "title": fitem.title,
                            "thumb_media_id": fitem.thumb_media_id,
                            "content": fitem.content
                        };
                        data1.news.articles.push(obj);
                    })


                    var _result = [];
                    mediaList.item.forEach(function (item) {
                        var _out = {};
                        _out.media_id = item.media_id;
                        _out.title = item.content.news_item[0].title;
                        _result.push(_out);
                    })

                    cb(null, { status: 0, "result": _result });
                }
            });
        }, function (err) {
            cb(err, { status: 1, "result": "" });
        });
        EWTRACE("requestMediaList End");
    }

    Watch.remoteMethod(
        'requestMediaList',
        {
            http: { verb: 'post' },
            description: '获取素材列表',
            returns: { arg: 'AddDoctor', type: 'object', root: true }
        }
    );

    Watch.RequestUserInfo = function (OpenID, cb) {
        EWTRACE("RequestUserInfo Begin");

        var _openid = OpenID.openid;

        var ps = [];
        var bsSQL = "select name,sex,birthday,height,weight,mobile,cardNo,disease_list as disease,isflag from hh_publicuser where openid = '" + _openid + "'";
        var userInfo = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, userInfo));

        bsSQL = "select followopenid,nickname,tel,ecc,headimage from hh_familyuser where openid = '" + _openid + "'";
        var myfollow = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, myfollow));

        Promise.all(ps).then(function () {
            if (userInfo.Result.length == 0) {
                bsSQL = "INSERT INTO hh_publicUser (id, openid,name, iccid, watchuserid,province,city,sex,status,type,headimage,isflag) VALUES (uuid(),'" + _openid + "','" + OpenID.nickname + "',null,null,'" + OpenID.province + "','" + OpenID.city + "','" + OpenID.sex + "',0,0,'" + OpenID.headimgurl + "',0);select name,sex,birthday,height,weight,mobile,cardNo,disease_list as disease,isflag from hh_publicuser where openid = '" + _openid + "'";
                DoSQL(bsSQL).then(function (result) {
                    userInfo.Result[0] = result[0];
                    userInfo.Result[0].followList = [];
                    if (myfollow.Result.length > 0) {
                        userInfo.Result[0].followList = myfollow.Result;
                    }
                    userInfo.Result[0].disease_list = {};

                    delete userInfo.Result[0].disease;

                    cb(null, { status: 1, "result": userInfo.Result[0] });
                })
                return;
            }

            userInfo.Result[0].followList = [];
            if (myfollow.Result.length > 0) {
                userInfo.Result[0].followList = myfollow.Result;
            }
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
        console.log(p.birthday);
        var age = 0;
        if (!_.isUndefined(p.birthday) && !_.isNull(p.birthday) && p.birthday != '') {
            age = GetDateDiff(p.birthday, (new Date()).format('yyyy-MM-dd'), 'year');
            fieldContext += " age = " + age + ",";
        }
        fieldContext += "isflag = 1,";

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

    Watch.RequestUserWeekly = function (p, OpenID, cb) {
        EWTRACE("RequestUserWeekly Begin");

        var _openid = OpenID.openid;
        console.log(p);

        if (!_.isUndefined(p.followOpenid)) {
            _openid = p.followOpenid;
        }

        var bsSQL1 = "select DATE_FORMAT(subdate(subdate(curdate(),date_format(curdate(),'%w')-1),7),'%Y-%m-%d') as monDay,DATE_FORMAT(subdate(curdate(),date_format(curdate(),'%w')),'%Y-%m-%d') as sunDay,DATE_FORMAT(subdate(subdate(curdate(),date_format(curdate(),'%w')-1),7),'%Y年%m月%d日') as monDay1,DATE_FORMAT(subdate(curdate(),date_format(curdate(),'%w')),'%Y年%m月%d日') as sunDay1";
        DoSQL(bsSQL1).then(function (result) {

            var ps = [];
            var bsSQL = "SELECT iccid,openid,sn,highpress,lowpress,hrcount,anb,pwv,absoluterisk,relativerisk,DATE_FORMAT(testtime,'%m月%d日 %H:%i') as testtime,  DATE_FORMAT(addtime,'%Y-%m-%d') as addtime,trackid,addtime2 FROM hh_userwatchdata where pwv <> -1 and openid = '" + _openid + "' and addtime between '" + result[0].monDay + "' and '" + result[0].sunDay + "' order by addtime desc";
            var _watchdata = {};
            ps.push(ExecuteSyncSQLResult(bsSQL, _watchdata));

            bsSQL = "SELECT userid,openid,belongdate,walknum,runnum,mileage,caloric,deepsleep,lightsleep,noadorn,sober,DATE_FORMAT(addtime,'%Y-%m-%d') as addtime,DATE_FORMAT(addtime,'%m月%d日 %H:%i') as testtime FROM hh_usersportdata where openid = '" + _openid + "' and addtime between '" + result[0].monDay + "' and '" + result[0].sunDay + "' order by addtime desc";
            var _sportdata = {};
            ps.push(ExecuteSyncSQLResult(bsSQL, _sportdata));


            bsSQL = "SELECT sum(highpress) / count(*) as high, sum(lowpress) / count(*) as low FROM hh_userwatchdata where openid = '" + _openid + "' and  addtime between '" + result[0].monDay + "' and '" + result[0].sunDay + "' order by addtime desc";
            var _avgData = {};
            ps.push(ExecuteSyncSQLResult(bsSQL, _avgData));

            var _sunDay = result[0].sunDay;
            Promise.all(ps).then(function () {

                var _result = {};

                _result.pwv = [];
                _result.pressure = [];
                _result.heartrate = [];
                _result.walk = [];
                _result.sleep = [];

                _result.weekDay = {};
                _result.weekDay.monDay = result[0].monDay1;
                _result.weekDay.sunDay = result[0].sunDay1;

                if (_avgData.Result.length == 0) {
                    _result.weekly = '您上周没有任何检测，所以无法提供健康周报';
                    _result.weeklyStatus = '0';
                    cb(err, { status: 1, "result": "您上周没有任何检测，所以无法提供健康周报" });
                    return;
                } else {
                    if (_avgData.Result[0].high >= 180 || _avgData.Result[0].low >= 110) {
                        _result.weekly = '亲爱的用户您好，本周您的心血管健康状况比较危险，血压指数有X次超过危险值，整体血压波动趋势大，每日应保证血压监测至少一次，观察其变化情况。降压药物每日坚持服用，饮食方面避免油腻、辛辣、高盐，不可过多劳累，精神紧张焦虑不安都会使得血压骤然升高，危害人的身心健康。建议早日去往医院进行全方面的诊断，如有需要，我们可提供陪护服务，为您带去方便和安心！';
                        _result.weeklyStatus = '100';
                    } else if (_avgData.Result[0].high >= 140 || _avgData.Result[0].low >= 90) {
                        _result.weekly = '亲爱的用户您好，本周您的心血管健康状况趋于危险，血压指数有X次超过标准值，整体血压波动趋势较大，平时应加强血压的监测。生活中应注意调整自己的心态，压抑会使血压升高，保持乐观向上的心态不但可以预防高血压，还是治疗高血压的的良药哦。如血压波动起伏仍然较大，建议去往医院进行全方面的诊断，我们可提供陪护服务，为您带去方便和安心！';
                        _result.weeklyStatus = '60';
                    } else {
                        _result.weekly = '亲爱的用户您好，本周您的心血管健康状况良好，整体血压波动趋势平稳，身体状况保持较好。平时注意劳逸结合，保持低盐饮食，维持体重，注意保暖，多进行有氧运动，保持心平气和状态，除了能有效避免高血压的变高，还能增强身心素质哦。';
                        _result.weeklyStatus = '30';
                    }
                }


                for (var i = 0; i < 7; i++) {

                    var curDate = GetDateAdd(_sunDay, -1 * i, 'day').format('yyyy-MM-dd');

                    var _filter = _.filter(_watchdata.Result, function (fitem) {
                        return fitem.addtime == curDate;
                    });

                    _filter.forEach(function (item) {

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

                    })


                    var _find = _.find(_sportdata.Result, function (fitem) {
                        return fitem.addtime == curDate;
                    });

                    if (!_.isUndefined(_find)) {
                        var walk = {};
                        walk.date = curDate;
                        walk.addtime = _find.testtime;
                        walk.value = _find.walknum;
                        _result.walk.push(walk);

                        var sleep = {};
                        sleep.date = curDate;
                        sleep.addtime = _find.testtime;
                        sleep.deepsleep = _find.deepsleep;
                        sleep.lightsleep = _find.lightsleep;
                        _result.sleep.push(sleep);
                    }
                }
                cb(null, { status: 0, "result": _result });

            }, function (err) {
                cb(err, { status: 1, "result": "" });
            });
        }, function (err) {
            cb(err, { status: 1, "result": "" });
        });
    }


    Watch.remoteMethod(
        'RequestUserWeekly',
        {
            http: { verb: 'post' },
            description: '查询用户检测周报',
            accepts: [{ arg: 'p', http: { source: 'body' }, type: 'object', description: '{"followOpenid":""}' },
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

    Watch.RequestUserMonitor = function (p, OpenID, cb) {
        EWTRACE("RequestUserMonitor Begin");

        var _openid = OpenID.openid;
        console.log(p);

        if (!_.isUndefined(p.followOpenid)) {
            _openid = p.followOpenid;
        }


        var ps = [];
        var bsSQL = "SELECT iccid,openid,sn,highpress,lowpress,hrcount,anb,pwv,absoluterisk,relativerisk,DATE_FORMAT(testtime,'%m月%d日 %H:%i') as testtime,  DATE_FORMAT(addtime,'%Y-%m-%d') as addtime,trackid,addtime2 FROM hh_userwatchdata where pwv <> -1 and openid = '" + _openid + "' and addtime >= DATE_ADD(now(),interval -7 day) order by addtime desc";
        var _watchdata = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _watchdata));

        bsSQL = "SELECT userid,openid,belongdate,walknum,runnum,mileage,caloric,deepsleep,lightsleep,noadorn,sober,DATE_FORMAT(addtime,'%Y-%m-%d') as addtime,DATE_FORMAT(addtime,'%m月%d日 %H:%i') as testtime FROM hh_usersportdata where openid = '" + _openid + "' and addtime >= DATE_ADD(now(),interval -7 day) order by addtime desc";
        var _sportdata = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _sportdata));

        Promise.all(ps).then(function () {

            var _result = {};

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

                })


                var _find = _.find(_sportdata.Result, function (fitem) {
                    return fitem.addtime == curDate;
                });

                if (!_.isUndefined(_find)) {
                    var walk = {};
                    walk.date = curDate;
                    walk.addtime = _find.testtime;
                    walk.value = _find.walknum;
                    _result.walk.push(walk);

                    var sleep = {};
                    sleep.date = curDate;
                    sleep.addtime = _find.testtime;
                    sleep.deepsleep = _find.deepsleep;
                    sleep.lightsleep = _find.lightsleep;
                    _result.sleep.push(sleep);
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
            accepts: [{ arg: 'p', http: { source: 'body' }, type: 'object', description: '{"followOpenid":""}' },
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


    Watch.reqeustDemoToken = function (cb) {


        var token = {
            openid: 'oFVZ-1M21POeEOX2gejWRkDE-EWw',
            nickname: '雷欢',
            sex: 1,
            language: 'zh_CN',
            city: 'Hangzhou',
            province: 'Zhejiang',
            country: 'China',
            headimgurl: 'http://wx.qlogo.cn/mmhead/QtOicY3g3wVK98hoG4OwVAKgRYbaHWo98ufh9RJSTQyw/0',
            privilege: [],
            unionid: 'oBQ4y07nsDSuqVSCJJSwZXYGVrgc'
        };

        cb(null, { status: 1, "result": GetTokenFromOpenID(token) });


        EWTRACE("reqeustDemoToken End");
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

        if (_.isUndefined(token)) {
            cb(err, { status: 0, "result": "" });
            return;
        }

        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
        } catch (err) {
            cb(err, { status: 0, "result": "" });
            return;
        }

        GetTokenFromOpenID(OpenID).then(function (result) {
            cb(null, { status: 1, "result": result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        })

        EWTRACE("requestToken End");

    }

    Watch.remoteMethod(
        'requestToken',
        {
            http: { verb: 'get' },
            description: '获取测试token',
            accepts: {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.query.token;
                },
                description: '{"token":""}'
            },
            returns: { arg: 'p', type: 'object', root: true }
        }
    );

    var winxinconfig = {
        grant_type: 'client_credential',
        noncestr: Math.random().toString(36).substr(2, 15),
        ticketUrl: 'https://api.weixin.qq.com/cgi-bin/ticket/getticket',
        cache_duration: 1000 * 60 * 60 * 24 //缓存时长为24小时
    }

    var request = require('request');
    var cache = require('memory-cache');
    var sha1 = require('sha1');

    var sign = function (url, callback) {

        require('dotenv').config({ path: './config/.env' });
        winxinconfig.appid = process.env.WX_APP_ID;
        winxinconfig.secret = process.env.WX_APP_SECRET;

        var noncestr = winxinconfig.noncestr,
            timestamp = Math.floor(Date.now() / 1000), //精确到秒
            jsapi_ticket;
        if (cache.get('ticket')) {
            jsapi_ticket = cache.get('ticket');
            console.log('1' + 'jsapi_ticket=' + jsapi_ticket + '&noncestr=' + noncestr + '&timestamp=' + timestamp + '&url=' + url);
            callback({
                noncestr: noncestr,
                timestamp: timestamp,
                url: url,
                appid: winxinconfig.appid,
                signature: sha1('jsapi_ticket=' + jsapi_ticket + '&noncestr=' + noncestr + '&timestamp=' + timestamp + '&url=' + url)
            });
        } else {

            Request_WxToken().then(function (respToken) {
                request(winxinconfig.ticketUrl + '?access_token=' + respToken.body.access_token + '&type=jsapi', function (error, resp, json) {
                    if (!error && resp.statusCode == 200) {
                        var ticketMap = JSON.parse(json);
                        cache.put('ticket', ticketMap.ticket, winxinconfig.cache_duration);  //加入缓存
                        console.log('jsapi_ticket=' + ticketMap.ticket + '&noncestr=' + noncestr + '&timestamp=' + timestamp + '&url=' + url);
                        callback({
                            noncestr: noncestr,
                            timestamp: timestamp,
                            url: url,
                            appid: winxinconfig.appid,
                            signature: sha1('jsapi_ticket=' + ticketMap.ticket + '&noncestr=' + noncestr + '&timestamp=' + timestamp + '&url=' + url)
                        });
                    }
                })
            }, function (err) {
                EWTRACE(err.message);
            });
            //     }
            // })

        }
    }


    Watch.GetTicket = function (GetTicket, cb) {
        EWTRACE("GetTicket Begin");

        var callback = function (result) {
            EWTRACEIFY(result);
            cb(null, { status: 1, "result": result });
        }
        sign(GetTicket.url, callback);
    };

    Watch.remoteMethod(
        'GetTicket',
        {
            http: { verb: 'post' },
            description: '获得Ticket',
            accepts: { arg: 'GetTicket', type: 'object', description: '{"url":""}' },
            returns: { arg: 'RegInfo', type: 'object', root: true }
        }
    );


    Watch.CheckQR = function (storeId, res, cb) {
        EWTRACE("CheckQR Begin:" + storeId.vgdecoderesult);

        EWTRACE('send ok');

        if ( storeId.vgdecoderesult == 'http://weixin.qq.com/q/02R1Wzh_lmd-k1Xk7VhpcS'){
            res.send("code=0000&&desc=ok");
        }
        else{
            res.send("code=0001&&desc=bad");
        }
        res.end();
        EWTRACE("CheckQR End");
    }

    Watch.remoteMethod(
        'CheckQR',
        {
            http: { verb: 'post' },
            description: '查询亲友信息',
            accepts: [{ arg: 'storeId', http: { source: 'body' }, type: 'object', description: '', root: true },
            {
                arg: 'res', type: 'object',
                http: function (ctx) {
                    var res = ctx.res;
                    return res;
                }
            }
            ],
            returns: { arg: 'p', type: 'string', root: true }
        }
    );

};




