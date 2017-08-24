/*
 * @Author: summer.ge 
 * @Date: 2017-08-24 13:27:54 
 * @Last Modified by: summer.ge
 * @Last Modified time: 2017-08-24 21:52:59
 */
'use strict';

module.exports = function (Patient) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Patient);
    var _ = require('underscore');
    var uuid = require('node-uuid');
    var needle = require('needle');

    var schedule = require("node-schedule");   //定时任务  
    var rule = new schedule.RecurrenceRule();

    
    Patient.ValidateWechatEvent = function (req, res, cb) {

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
        'ValidateWechatEvent',
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


    Patient.ValidateWechatEvent = function (req, res, cb) {

        EWTRACE("ValidateWechatEvent Begin")
        console.log(req.body.xml);

        var q = req.query;
        var openid = q.openid; //微信加密签名  

        if (!_.isEmpty(req.body.xml.event) ) {
            EWTRACE("Event:" + req.body.xml.event[0]);
            var _event = req.body.xml.event[0];
            EWTRACE(_event);
            var _eventKey = "";
            if (!_.isEmpty(req.body.xml.eventkey)) {
                _eventKey = req.body.xml.eventkey[0];
            }
            res.write(new Buffer("").toString("UTF-8"));
            res.end();

            if (_event == 'subscribe' || _event == 'SCAN') {
                EWTRACE("EventKey:" + _eventKey);
                if (_eventKey.substr(0, 7) == 'family_') {
                    AddFamilyUser(req, res, cb);
                } else {
                    regUser(req, res, cb);
                }

            }

            if (_event == 'unsubscribe') {
                unregUser(req, res, cb);
            }

            if (_event == 'CLICK') {
                if ( _eventKey == "Create_Token"){
                    GetWXNickName(req.body.xml.fromusername[0]).then(function(result){
                        var userInfo = {};
                        GetTokenFromOpenID(userInfo, result).then(function(token){
                            EWTRACE(token);
                        })
                    },function(err){

                    });
                }
            }
            if ( _event == 'location_select'){
                if ( _eventKey == 'SOS_Notify'){
                    EWTRACE("call WXClick_SOS");
                    WXClick_SOS(req, res, cb);
                }
            }

            if ( _event == 'LOCATION'){
                UpdateUserLBS(req.body.xml);
            }
        }
        else {
            res.write(new Buffer("").toString("UTF-8"));
            res.end();
        }

    };

    Patient.remoteMethod(
        'ValidateWechatEvent',
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

    Patient.WatchCallSOS = function (req, cb) {
        EWTRACE("WatchCallSOS Begin");

        var appId = req.headers.appId;
        var appSecret = req.headers.appSecret;
        var sign = req.headers.sign;
        var rnd = req.query.rnd;
        var body = req.body;

        EWTRACE("appId:" + appId);
        EWTRACE("appSecret:" + appSecret);
        EWTRACE("sign:" + sign);
        EWTRACE("rnd:" + rnd);
        EWTRACEIFY(body);

        var localSign = CreateMD5(rnd);

        if (localSign.toUpperCase() == sign.toUpperCase()) {

            var bsSQL = "select openid,name from hh_publicuser where iccid = '" + body.iccid + "'";


            DoSQL(bsSQL).then(function (UserInfo) {

                if (UserInfo.length == 0) {
                    cb(null, { code: 1, "message": "iccid未找到" });
                    return;
                }
                var openId = UserInfo[0].openid;

                var ps = [];
                var bsSQL = "select followopenid as openid,nickname as name from hh_familyuser where openid = '" + openId + "'";
                var _notifyList = {};
                ps.push(ExecuteSyncSQLResult(bsSQL, _notifyList));

                bsSQL = "select name from hh_publicuser where openid = '" + openId + "'";
                var _localUser = {};
                ps.push(ExecuteSyncSQLResult(bsSQL, _localUser));

                Promise.all(ps).then(function () {

                    _SendWX(_notifyList.Result, _localUser.Result[0]);
                    cb(null, { code: 0, "message": "operate success" });
                });
            }, function (err) {
                cb(err, { code: -1, "message": err.message });
                EWTRACE("message" + err.message);
            })
        }
        else {
            cb(null, { code: 1001, "message": "数字签名错误，appId未授权" });
            EWTRACE("message：数字签名错误，appId未授权");
        }
    }


    Patient.remoteMethod(
        'WatchCallSOS',
        {
            http: { verb: 'post' },
            description: '手表紧急SOS',
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

    Patient.testCallSportData = function (cb) {
        EWTRACE("testCallSportData Begin");
        var now = new Date().format('yyyy-MM-dd');
        var getDay = GetDateAdd(now, -1, 'day').format('yyyy-MM-dd');
        getEveryDayData(getDay);
        cb(null, { code: 0, "message": "operate success" });
    }


    Patient.remoteMethod(
        'testCallSportData',
        {
            http: { verb: 'post' },
            description: '测试获取全天数据',
            returns: { arg: 'UserInfo', type: 'object', root: true }
        }
    );

    function UpdateUserLBS(location){
        console.log(location);

        var bsSQL = "update hh_publicuser set location_x = '" + location.longitude[0] + "', location_y = '" + location.latitude[0] + "' where openid = '"+ location.fromusername[0]+"'";

        DoSQL(bsSQL).then(function(){
            EWTRACE("update ok");
        })
    }

    function WXClick_SOS(req, res, cb) {

        var openId = req.body.xml.fromusername[0];


        var ps = [];
        var bsSQL = "select followopenid as openid,nickname as name from hh_familyuser where openid = '" + openId + "'";
        var _notifyList = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _notifyList));

        bsSQL = "select name from hh_publicuser where openid = '" + openId + "'";
        var _localUser = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _localUser));

        Promise.all(ps).then(function () {

            console.log(req.body.xml.sendlocationinfo);
            _SendSOSWX(_notifyList.Result, _localUser.Result[0], req.body.xml.sendlocationinfo[0]);
        }, function (err) {

        })
    }


    function unregUser(req, res, cb) {

        var q = req.query;
        var openid = q.openid; //微信加密签名 

        var bsSQL = "update hh_publicUser set iccid='' where openid = '" + openid + "'";
        DoSQL(bsSQL).then(function (userResult) {

            //cb(null, { status: 0, "result": "" });
        }, function (err) {
            //cb(err, { status: 1, "result": "" });
            EWTRACE("Error" + err.message);
        });
    };

    function regUser(req, res, cb) {

        var q = req.query;
        var openid = q.openid; //微信加密签名 
        var watch_iccid = req.body.xml.eventkey[0];
        if (watch_iccid.indexOf('_') > 0) {
            watch_iccid = watch_iccid.substr(watch_iccid.indexOf('_') + 1);
        }

        GetWXNickName(openid).then(function (userInfo) {
            require('dotenv').config({ path: './config/.env' });

            var url = "https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=" + userInfo.access_token;

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

                    var urlInfo = { "method": "registerUser.open" };
                    //CreateURL(urlInfo, false)
                    CreateURL(urlInfo)

                    needle.post(encodeURI(urlInfo.url), AddWatch, urlInfo.options, function (err, resp) {
                        // you can pass params as a string or as an object.

                        if (err || (resp.body.code != 0 && watch_iccid != '')) {
                            //cb(err, { status: 0, "result": "" });
                            EWTRACEIFY(resp.body);
                            if ( watch_iccid != ''){
                                var bsSQL = "update hh_publicUser set openid ='" + openid + "' where iccid = '" + watch_iccid + "'";
                                DoSQL(bsSQL).then(function () {
                                    //cb(null, { status: 0, "result": "" });
                                }, function (err) {
                                    //cb(err, { status: 1, "result": "" });
                                    EWTRACE("Error" + err.message);
                                });
                            }
                        }
                        else {
                            var bsSQL = "select * from hh_publicUser where openid = '" + openid + "'";
                            DoSQL(bsSQL).then(function (userResult) {
                                var _userId = 'null';
                                if ( !_.isUndefined(resp.body.data)){
                                    _userId = resp.body.data.userId;
                                }
                                bsSQL = "";
                                if (userResult.length == 0) {
                                    if ( watch_iccid != ''){
                                        bsSQL = "update hh_publicuser set watchuserid = null,iccid=null where iccid = '" + watch_iccid + "';"
                                    }

                                    bsSQL += "INSERT INTO hh_publicUser (id, openid,name, iccid, watchuserid,province,city,sex,status,type) VALUES (uuid(),'" + openid + "','" + userInfo.nickname + "','" + watch_iccid + "'," + _userId + ",'" + userInfo.province + "','" + userInfo.city + "','" + userInfo.sex + "',0,0);";
                                } else {
                                    bsSQL = "update hh_publicuser set watchuserid = null,iccid=null where iccid = '" + watch_iccid + "';"
                                    bsSQL += "update hh_publicUser set iccid = '" + watch_iccid + "', watchuserid = " + _userId + ",name='" + userInfo.nickname + "' where openid ='" + openid + "'";
                                }

                                DoSQL(bsSQL).then(function () {
                                    //cb(null, { status: 0, "result": "" });
                                }, function (err) {
                                    //cb(err, { status: 1, "result": "" });
                                    EWTRACE("Error" + err.message);
                                });
                            }, function (err) {
                                //cb(err, { status: 1, "result": "" });
                                EWTRACE("Error" + err.message);
                            });

                        }
                    });
                }
            });

        }, function (err) {
            EWTRACE("Error" + err.message);
        })
    }

    Patient.uploadPressureData = function (req, cb) {
        EWTRACE("uploadPressureData Begin");

        var appId = req.headers.appId;
        var appSecret = req.headers.appSecret;
        var sign = req.headers.sign;
        var rnd = req.query.rnd;
        var body = req.body;

        EWTRACE("appId:" + appId);
        EWTRACE("appSecret:" + appSecret);
        EWTRACE("sign:" + sign);
        EWTRACE("rnd:" + rnd);
        EWTRACEIFY(body);

        var localSign = CreateMD5(rnd);

        if (localSign.toUpperCase() == sign.toUpperCase()) {

            var bsSQL = "select openid,name from hh_publicuser where iccid = '" + body.iccid + "'";
            DoSQL(bsSQL).then(function (UserInfo) {

                if (UserInfo.length == 0) {
                    cb(null, { code: 1, "message": "iccid未找到" });
                    return;
                }

                bsSQL = "insert into hh_userwatchdata(iccid,openid,sn,highpress,lowpress,hrcount,anb,pwv,absoluterisk,relativerisk,testtime,addtime,trackid,addtime2) values('" + body.iccid + "','" + UserInfo[0].openid + "','" + body.sn + "'," + body.highPress + "," + body.lowPress + "," + body.hrCount + "," + body.anb + "," + body.pwv + "," + body.absoluteRisk + "," + body.relativeRisk + ",'" + body.testTime + "',date_format(now(), '%Y-%m-%d')," + body.trackId + ",unix_timestamp());";

                DoSQL(bsSQL).then(function () {
                    cb(null, { code: 0, "message": "operate success" });
                    EWTRACE("正常接收");
                    _SendCheckWX(UserInfo[0], body);
                }, function (err) {
                    cb(null, { code: -1, "message": err.message });
                    EWTRACE("message" + err.message);
                })


            }, function (err) {
                cb(err, { code: -1, "message": err.message });
                EWTRACE("message" + err.message);
            })
        }
        else {
            cb(null, { code: 1001, "message": "数字签名错误，appId未授权" });

            EWTRACE("message：数字签名错误，appId未授权");
        }
    }


    Patient.remoteMethod(
        'uploadPressureData',
        {
            http: { verb: 'post' },
            description: '单次测量血压结果上传',
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

    var pageSize = 10;

    function getEveryDayData(getDay) {
        EWTRACE("getEveryDayData Begin");

        var bsSQL = "select count(*) as counts from hh_publicuser where watchuserid is not null and watchuserid not in (select userid from hh_usersportdata where addtime = '" + getDay + "')";
        DoSQL(bsSQL).then(function (result) {
            var count = Math.ceil(result[0].counts / pageSize);

            for (var _dolimit = 0; _dolimit < count; _dolimit++) {
                _getLimitUserData(_dolimit, getDay).then(function (result) {

                }, function (err) {
                    EWTRACE('数据获取失败:' + err.message)

                })
            }

        }, function (err) {
            EWTRACE("Error:" + err.message);
        });

    }

    function _getLimitUserData(pageIndex, getDay) {
        return new Promise(function (resolve, reject) {

            var bsSQL = "select watchuserid,openid,DATE_FORMAT(now(),'%Y-%m-%d') as belongDate from hh_publicuser where watchuserid is not null and watchuserid not in (select userid from hh_usersportdata where addtime = '" + getDay + "') limit " + (pageIndex * pageSize) + "," + pageSize;
            DoSQL(bsSQL).then(function (result) {
                if (result.length == 0) {
                    resolve(0);
                    return;
                }

                var urlInfo = { "method": "getEveryDayData.open" };
                CreateURL(urlInfo)

                var _time = "&deviceType=0&belongDate=" + result[0].belongDate;
                var idList = "&userIds=";
                result.forEach(function (item) {

                    idList += item.watchuserid + ",";
                });

                //_time = "&deviceType=0&belongDate=2017-08-20";

                idList = idList.substr(0, idList.length - 1);
                urlInfo.url += idList + _time;
                EWTRACE(urlInfo.url);
                needle.get(encodeURI(urlInfo.url), urlInfo.options, function (err, resp) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (_.isUndefined(resp.body.data) || resp.body.code != 0) {
                        reject(new Error('数据返回错误！'));
                        return;
                    }

                    EWTRACE("code:" + resp.body.code + ", message:" + resp.body.message + ", return user length : " + resp.body.data.length);

                    bsSQL = "";
                    resp.body.data.forEach(function (item) {

                        var openId = _.find(result, function (fitem) {
                            return fitem.watchuserid == item.userId.toString();
                        });

                        var _openid = '';
                        if (!_.isUndefined(openId)) {
                            _openid = openId.openid;
                        }

                        bsSQL += "insert into hh_usersportdata(userid,openid,belongdate,walknum,runnum,mileage,caloric,deepsleep,lightsleep,noadorn,sober,addtime) values(" + item.userId + ",'" + _openid + "','" + item.belongDate + "'," + item.sport.walkNum + "," + item.sport.runNum + "," + item.sport.mileage + "," + item.sport.caloric + "," + item.sleep.deepSleep + "," + item.sleep.lightSleep + "," + item.sleep.noAdorn + "," + item.sleep.sober + ",'" + getDay + "');";
                    })

                    if (bsSQL.length > 0) {
                        DoSQL(bsSQL).then(function () {
                            resolve(0);
                        }, function (err) {
                            reject(result);
                        })
                    }
                    else {
                        resolve(0);
                    }

                });

            }, function (err) {
                reject(err);
            });
        });
    }


    function initTimer() {
        EWTRACE("init timer");
        rule.second = 1;
        var job = schedule.scheduleJob(rule, function () {
            var currentTime = new Date();
            //require('dotenv').config({ path: './config/.env' });
            var _curTime = currentTime.toTimeString().substr(0, 2);



            if (_curTime == '02' || _curTime == '03') {
                var _curMinute = currentTime.toTimeString().substr(3, 2);

                if (_curMinute == '30') {
                    var now = new Date().format('yyyy-MM-dd');
                    var getDay = GetDateAdd(now, -1, 'day').format('yyyy-MM-dd');
                    getEveryDayData(getDay);
                }
            }

            if (_curTime == '04') {
                var _curMinute = currentTime.toTimeString().substr(3, 2);

                if (_curMinute == '10') {
                    var exec = require('child_process').exec;
                    var cmdStr = "pm2 restart wx-token";
                    exec(cmdStr, function (err, stdout, stderr) {

                        if (err) {
                            EWTRACE(err.message)
                        }
                        else {
                            EWTRACE(stdout);
                        }
                    });
                    return;
                }
                if (_curMinute == '30') {

                    var bsSQL = "insert into hh_usersportdata_history select * from hh_usersportdata where addtime > DATE_ADD(now(),interval -7 day);delete from hh_usersportdata where addtime > DATE_ADD(now(),interval -7 day)";
                    DoSQL(bsSQL).then(function () {

                        bsSQL = "insert into hh_userwatchdata_history select * from hh_userwatchdata where addtime > DATE_ADD(now(),interval -7 day);delete from hh_userwatchdata where addtime > DATE_ADD(now(),interval -7 day)";
                        DoSQL(bsSQL).then(function () {


                        }, function (err) {
                            EWTRACE("err:" + err.message);
                        })
                    }, function (err) {
                        EWTRACE("err:" + err.message);
                    })
                }
            }
        });
        //return job;
    };
    initTimer();





    function AddFamilyUser(req, res, cb) {
        EWTRACE("AddFamilyUser Begin");


        var localOpenid = req.body.xml.eventkey[0].substr(7);
        var fromOpenid = req.body.xml.fromusername[0];

        var ps = [];
        var bsSQL = "select * from hh_publicuser where openid = '" + localOpenid + "'";
        var _localUser = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _localUser));

        bsSQL = "select * from hh_publicuser where openid = '" + fromOpenid + "'";
        var _familyUser = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _familyUser));

        bsSQL = "select * from hh_familyuser where openid = '" + localOpenid + "' and followopenid = '" + fromOpenid + "'";
        var _myfollow = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _myfollow));

        bsSQL = "select * from hh_familyuser where openid = '" + fromOpenid + "' and followopenid = '" + localOpenid + "'";
        var herfollow = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, herfollow));

        Promise.all(ps).then(function () {

            GetWXNickName(fromOpenid).then(function (userInfo) {

                if (_familyUser.Result.length == 0) {
                    bsSQL += "INSERT INTO hh_publicUser (id, openid,name) VALUES (uuid(),'" + fromOpenid + "','" + userInfo.nickname + "');";
                    DoSQL(bsSQL).then(function () {

                    }, function (err) {

                    })
                }

                bsSQL = "";
                if (_myfollow.length == 0) {
                    bsSQL += "insert into hh_familyuser(openid,followopenid,nickname,tel,ecc) values('" + localOpenid + "','" + fromOpenid + "','" + userInfo.nickname + "','',0);";
                }
                if (herfollow.length == 0) {

                    var nickname = "";
                    if (!_.isNull(_localUser.Result[0].name)) {
                        nickname = _localUser.Result[0].name;
                    }

                    var tel = "";
                    if (!_.isNull(_localUser.Result[0].mobile)) {
                        tel = _localUser.Result[0].mobile;
                    }

                    bsSQL += "insert into hh_familyuser(openid,followopenid,nickname,tel,ecc) values('" + fromOpenid + "','" + localOpenid + "','" + nickname + "','" + tel + "',0);";
                }
                DoSQL(bsSQL).then(function () {

                }, function (err) {

                })

            }, function (err) {

            })
        }, function (err) {

        })
    }

};


