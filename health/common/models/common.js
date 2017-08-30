/*
 * @Author: summer.ge 
 * @Date: 2017-08-24 13:48:31 
 * @Last Modified by: summer.ge
 * @Last Modified time: 2017-08-31 00:00:28
 */

var log4js = require('log4js');
var _ = require('underscore');
var needle = require('needle');
var jwt = require('jsonwebtoken');

module.exports = function (common) {
    var app = require('../../server/server');
    app.DisableSystemMethod(common);

    /********************************************************* 
    * @Author: summer.ge 
    * @Date: 2017-08-24 13:48:31 
    * @Desc: 删除数据库返回多个记录集中，非数据包记录
    * @Param: result   connector返回结果集
    *********************************************************/
    DelOKPacket = function (result) {
        if (result && _.isArray(result)) {
            var mr = _.find(result, function (item) {
                return item.fieldCount != undefined;
            });
            if (mr) {
                var r = _.find(result, function (item) {
                    return item.fieldCount == undefined;
                });
                if (r) {
                    result = r;
                }
            }
        }
        return result;
    };

    /********************************************************* 
    * @Author: summer.ge 
    * @Date: 2017-08-24 13:48:31 
    * @Desc: 查询单条SQL，或一个多条SQL批
    * @Param: SQL           sql语法，可用；同时执行多条
    *         Connect       数据库连接，如果不填则获取当前连接名为main_DBConnect
    *********************************************************/
    DoSQL = function (SQL, Connect) {
        return new Promise(function (resolve, reject) {
            EWTRACE(SQL);
            var dataSource = Connect;
            if (dataSource == undefined)
                dataSource = common.app.datasources.main_DBConnect;
            dataSource.connector.execute(SQL, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    var _result = DelOKPacket(result);
                    if (_.isEmpty(_result) || _result.length == 0) {
                        resolve([]);
                    }
                    else {
                        resolve(_result);
                    }
                }
            });
        });
    }

    /********************************************************* 
    * @Author: summer.ge 
    * @Date: 2017-08-24 13:48:31 
    * @Desc: 查询单条SQL，纳入数组后，由Promise.All统一执行
    * @Param: SQL           sql语法，可用；同时执行多条
    *         ResultObj     当前执行后返回的数据对象
    *         tx            事物对象
    *         Connect       数据库连接，如果不填则获取当前连接名为main_DBConnect
    *********************************************************/
    ExecuteSyncSQLResult = function (bsSQL, ResultObj, tx, Connect) {
        return new Promise(function (resolve, reject) {
            try {
                EWTRACE(bsSQL);
                var dataSource = Connect;
                if (dataSource == undefined)
                    dataSource = common.app.datasources.main_DBConnect;
                dataSource.connector.executeSQL(bsSQL, {}, { transaction: tx }, function (err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        if (ResultObj)
                            ResultObj.Result = result;
                        resolve(result);
                    }
                });
            } catch (ex) {
                reject(ex);
            }
        });
    }

    /**
     * 日志相关
     */
    log4js.configure('./logs/log4js.json');
    var logger = log4js.getLogger('DEBUG_OSS::');
    logger.setLevel('INFO');
    EWTRACE = function (Message) {
        var myDate = new Date();
        var nowStr = myDate.format("yyyyMMdd hh:mm:ss");
        logger.info(Message + "\r");
    }
    //接受参数
    EWTRACEIFY = function (Message) {
        var myDate = new Date();
        var nowStr = myDate.format("yyyyMMdd hh:mm:ss");
        // logger.warn(JSON.stringify(Message) + "\r");
        logger.warn(Message);
    }
    //提醒
    EWTRACETIP = function (Message) {
        logger.warn("Tip:" + JSON.stringify(Message) + "\r");
    }
    //错误
    EWTRACEERROR = function (Message) {
        logger.error(JSON.stringify(Message) + "\r");
    }

    /**
     * 日期相关函数
     */
    Date.prototype.format = function (format) {
        var o = {
            "M+": this.getMonth() + 1, //month 
            "d+": this.getDate(), //day 
            "h+": this.getHours(), //hour 
            "m+": this.getMinutes(), //minute 
            "s+": this.getSeconds(), //second 
            "q+": Math.floor((this.getMonth() + 3) / 3), //quarter 
            "S": this.getMilliseconds() //millisecond 
        }
        if (/(y+)/.test(format)) {
            format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        }
        for (var k in o) {
            if (new RegExp("(" + k + ")").test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
            }
        }
        return format;
    }

    function getYearWeek(date) {
        var date2 = new Date(date.getFullYear(), 0, 1);
        var day1 = date.getDay();
        if (day1 == 0) day1 = 7;
        var day2 = date2.getDay();
        if (day2 == 0) day2 = 7;
        d = Math.round((date.getTime() - date2.getTime() + (day2 - day1) * (24 * 60 * 60 * 1000)) / 86400000);
        return Math.ceil(d / 7) + 1;
    }

    function getWeekNum(date) {
        var DayList = [];
        var i = 1;
        while (i <= 8) {
            if (date.getDay() == 1 || date.getDay() == 3) {
                var strMonth = date.getMonth() + 1;
                if (strMonth < 10)
                { strMonth = "0" + strMonth; }
                var strDay = date.getDate();
                if (strDay < 10)
                { strDay = "0" + strDay }
                DayList.push(date.getFullYear() + "-" + strMonth + "-" + strDay);
                i++;
            }
            date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        }
        return DayList;
    }

    GetDateDiff = function (startTime, endTime, diffType) {
        //将xxxx-xx-xx的时间格式，转换为 xxxx/xx/xx的格式 
        startTime = startTime.replace(/\-/g, "/");
        endTime = endTime.replace(/\-/g, "/");
        //将计算间隔类性字符转换为小写
        diffType = diffType.toLowerCase();
        var sTime = new Date(startTime);      //开始时间
        var eTime = new Date(endTime);  //结束时间
        //作为除数的数字
        var divNum = 1;
        switch (diffType) {
            case "second":
                divNum = 1000;
                break;
            case "minute":
                divNum = 1000 * 60;
                break;
            case "hour":
                divNum = 1000 * 3600;
                break;
            case "day":
                divNum = 1000 * 3600 * 24;
                break;
            case "year":
                divNum = 1000 * 3600 * 24 * 365;
                break;
            default:
                break;
        }
        return parseInt((eTime.getTime() - sTime.getTime()) / parseInt(divNum));
    }

    GetDateAdd = function (startTime, addTimes, diffType) {
        //将xxxx-xx-xx的时间格式，转换为 xxxx/xx/xx的格式 
        startTime = startTime.replace(/\-/g, "/");
        //将计算间隔类性字符转换为小写
        diffType = diffType.toLowerCase();
        var sTime = new Date(startTime);      //开始时间
        //作为除数的数字
        var divNum = 1;
        switch (diffType) {
            case "second":
                divNum = 1000;
                break;
            case "minute":
                divNum = 1000 * 60;
                break;
            case "hour":
                divNum = 1000 * 3600;
                break;
            case "day":
                divNum = 1000 * 3600 * 24;
                break;
            default:
                break;
        }
        return new Date(sTime.getTime() + addTimes * divNum);
    }


    /**
     * 各类发送
     */
    _SendMail = function (tomail, mailsubject, mailcontext) {
        EWTRACE("tomail:" + tomail);
        EWTRACE("mailsubject:" + mailsubject);
        EWTRACE("mailcontext:" + mailcontext);
        require('dotenv').config({ path: './config/.env' });
        var nodemailer = require("nodemailer");
        // 开启一个 SMTP 连接池
        var smtpTransport = nodemailer.createTransport("SMTP", {
            host: "mail.downtown8.com", // 主机
            secureConnection: false, // 使用 SSL
            port: 465, // SMTP 端口
            auth: {
                user: process.env.BusinessMailAddress, // 账号
                pass: process.env.mailpassword // 密码
            }
        });
        // 设置邮件内容
        var mailOptions = {
            from: "<business@downtown8.com>", // 发件地址
            to: tomail, // 收件列表
            subject: mailsubject, // 标题
            html: "<br>" + mailcontext // html 内容
        }
        // 发送邮件
        _SelfSendMail = function (resolve, reject) {
            smtpTransport.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    console.log("Message sent: " + response.message);
                    resolve(null);
                }
                smtpTransport.close(); // 如果没用，关闭连接池
            });
        }
        return new Promise(_SelfSendMail);
    }

    SendSMS = function (mobile, context, type) {
        _SendSMS = function (resolve, reject) {
            var smsService = common.app.dataSources.luosimaoRest;
            if (type == 1) {
                smsService = common.app.dataSources.luosimaoRegCheck;
            }
            smsService.send(mobile, context, 30, function (err, response, context) {
                if (err)
                { reject(err); }
                if (response[0].error) {
                    reject(new Error(response[0].msg));
                } else {
                    resolve(null);
                }
            });
        };
        return new Promise(_SendSMS);
    }


    /**
     * JWT加密、解密
     */
    GetTokenFromOpenID = function (userinfo) {
        delete userinfo.exp;
        var rf = require("fs");
        var cert = rf.readFileSync("jwt_rsa_private_key.pem", "utf-8");
        return new Promise(function (resolve, reject) {
            jwt.sign(userinfo, cert, { algorithm: 'RS256', expiresIn: '1d' }, function (err, token) {
                if (err) {
                    reject(err);
                } else {
                    resolve(token);
                }
            });
        });
    }

    GetOpenIDFromToken = function (token) {
        var jwt = require('jwt-simple');
        var rf = require("fs");
        var secret = rf.readFileSync("jwt_rsa_public_key.pem", "utf-8");
        var decoded = null;
        try {
            decoded = jwt.decode(token, secret);
            EWTRACEIFY(decoded);
            return decoded;
        } catch (err) {
            throw (err);
        }
    }

    _SendWX = function (UserList, localUser) {
        require('dotenv').config({ path: './config/.env' });
        Request_WxToken().then(function (resp) {
            EWTRACE(resp.body.access_token);
            var _accesstoken = resp.body.access_token;
            var myDate = new Date();
            UserList.forEach(function (item) {
                var _color = "#FF004F";
                var WXData = {
                    "touser": item.openid,
                    "template_id": process.env.WeChat_TakeErrorID,
                    "data": {
                        "first": {
                            "value": "紧急通知",
                        },
                        "keyword1": {
                            "value": localUser.name,
                        },
                        "keyword2": {
                            "value": item.name,
                            "color": _color
                        },
                        "keyword3": {
                            "value": (new Date()).format('yyyy-MM-dd hh:mm:ss'),
                            "color": _color
                        },
                        "remark": {
                            "value": "曼康信息提示，你关注的亲友紧急呼叫，社区医生已经紧急赶往"
                        }
                    }
                }
                self_sendWX(_accesstoken, WXData);
            });
        }, function (err) {
            console.log(err);
        });
    }

    GetAddressFromLBS_TX = function (location_x, location_y) {
        return new Promise(function (resolve, reject) {
            var url = "http://apis.map.qq.com/ws/geocoder/v1/?location=" + location_x + "," + location_y + "&key=6UWBZ-BRKR3-YWG3Y-337NE-DRCMZ-EGBF7";

            needle.get(encodeURI(url), null, function (err, localInfo) {

                if (err) {
                    reject(err);
                }
                else {
                    if (localInfo.body.status == 0) {
                        resolve(localInfo.body.result.address);
                    }
                    else {
                        reject(localInfo.body.message);
                    }
                }
            });
        });
    }

    GetAddressFromLBS_GD = function (location_x, location_y) {
        return new Promise(function (resolve, reject) {
            var url = "http://restapi.amap.com/v3/geocode/regeo?location=" + location_y + "," + location_x + "&key=974a2c2c4f3fdbc1892cc70aa679dc01";

            needle.get(encodeURI(url), null, function (err, localInfo) {

                if (err) {
                    reject(err);
                }
                else {
                    if (localInfo.body.status == 1) {
                        resolve(localInfo.body.regeocode.formatted_address);
                    }
                    else {
                        reject(localInfo.body.message);
                    }
                }
            });
        });
    }

    _SendSOSWX = function (UserList, localUser, localtion) {

        var location_x = "";
        var location_y = "";
        var label = "";
        if (!_.isUndefined(localtion)) {
            console.log(localtion);
            location_x = localtion.location_x[0];
            location_y = localtion.location_y[0];
            label = localtion.label[0];
        }
        else {
            location_x = localUser.location_x;
            location_y = localUser.location_y;

        }

        GetAddressFromLBS_TX(location_x, location_y).then(function (address) {

            require('dotenv').config({ path: './config/.env' });
            Request_WxToken().then(function (resp) {
                EWTRACE(resp.body.access_token);
                var _accesstoken = resp.body.access_token;
                var myDate = new Date();
                UserList.forEach(function (item) {
                    var _color = "#FF004F";
                    var WXData = {
                        "touser": item.openid,
                        'url': "http://apis.map.qq.com/uri/v1/geocoder?coord=" + location_x + "," + location_y + "&referer=mankangapp",
                        "template_id": process.env.WeChat_TakeSOSID,
                        "data": {
                            "first": {
                                "value": "紧急通知",
                            },
                            "keyword1": {
                                "value": localUser.name + '发送紧急呼救请关注',
                                "color": _color
                            },
                            "keyword2": {
                                "value": address + "[地址仅供参考]",
                                "color": _color
                            },
                            "keyword3": {
                                "value": (new Date()).format('yyyy-MM-dd hh:mm:ss'),
                                "color": _color
                            },
                            "remark": {
                                "value": "曼康信息提示，你关注的亲友紧急呼叫，社区医生已经紧急赶往"
                            }
                        }
                    }
                    EWTRACE("self_sendWX");
                    EWTRACEIFY(WXData);
                    self_sendWX(_accesstoken, WXData);
                });
            }, function (err) {
                console.log(err);
            });
        }, function (err) {
            console.log(err);
        });
    }

    SendWX = function (obj, type) {
        var _type = "";
        if (!_.isEmpty(type)) {
            _type = "and onlineissuetype in (" + type + ")";
        }
        var bsSQL = "select openid from oss_users where openid is not null " + _type;
        DoSQL(bsSQL, function (err1, result) {
            if (!err1) {
                _SendWX(result, obj);
            }
        });
    }

    getIPAdress = function () {
        var interfaces = require('os').networkInterfaces();
        for (var devName in interfaces) {
            var iface = interfaces[devName];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                    return alias.address;
                }
            }
        }
    }

    CreateMD5 = function (now) {
        require('dotenv').config({ path: './config/.env' });
        var tmpCode = process.env.APP_ID + process.env.APP_SECRET + now;
        EWTRACE("MD5 Express: " + tmpCode);
        var crypto = require('crypto');
        var sign = crypto.createHash('md5').update(tmpCode, 'utf8').digest('hex');
        EWTRACE("MD5 Cry: " + sign);
        return sign;
    }

    /**
     * 手环厂商生成访问URL
     */
    CreateURL = function (URLInfo, noAuth) {
        var now = (new Date()).getTime();
        var sign = CreateMD5(now);
        URLInfo.url = process.env.REQUEST_WATCH_URL + URLInfo.method;
        URLInfo.options = { json: true };
        if (_.isUndefined(noAuth)) {
            URLInfo.url += "?rnd=" + now.toString();
            URLInfo.options = {
                headers: {
                    'appId': process.env.APP_ID,
                    'appSecret': process.env.APP_SECRET,
                    'sign': sign
                },
                json: true
            }
        }
        else {
        }
    }


    /**
     * 根据openid，获取对应微信账号信息
     */
    GetWXNickName = function (fromOpenid) {
        return new Promise(function (resolve, reject) {
            Request_WxToken().then(function (resp) {
                var url = "https://api.weixin.qq.com/cgi-bin/user/info?access_token=" + resp.body.access_token + "&openid=" + fromOpenid + "&lang=zh_CN";
                needle.get(encodeURI(url), null, function (err, userInfo) {
                    // you can pass params as a string or as an object.
                    if (err) {
                        //cb(err, { status: 0, "result": "" });
                        EWTRACE(err.message);
                        reject(err);
                    }
                    else {
                        userInfo.body.access_token = resp.body.access_token;
                        EWTRACEIFY(userInfo.body);
                        resolve(userInfo.body);
                    }
                });
            }, function (err) {
                reject(err);
            })
        })
    }

    GetWXNickName2 = function (fromOpenid) {
        return new Promise(function (resolve, reject) {
            Request_WxToken().then(function (resp) {
                var url = "https://api.weixin.qq.com/cgi-bin/user/info/batchget?access_token=" + resp.body.access_token;

                var List = {
                    user_list: [{
                        "openid": fromOpenid,
                        "lang": 'zh_CN'
                    }]
                };
                needle.post(encodeURI(url), List, { json: true }, function (err, userInfo) {
                    // you can pass params as a string or as an object.
                    if (err) {
                        //cb(err, { status: 0, "result": "" });
                        EWTRACE(err.message);
                        reject(err);
                    }
                    else {
                        var result = {};
                        result.body = userInfo.body.user_info_list[0];
                        result.body.access_token = resp.body.access_token;

                        resolve(result.body);
                    }
                });
            }, function (err) {
                reject(err);
            })
        })
    }

    _SendCheckWX = function (userInfo, CheckData) {
        var needle = require('needle');
        require('dotenv').config({ path: './config/.env' });
        Request_WxToken().then(function (resp) {
            EWTRACE(resp.body.access_token);
            var _accesstoken = resp.body.access_token;
            var myDate = new Date();
            var _color = "#3300FF";
            var relativeRisk = "不变";
            if (CheckData.relativeRisk == 0) {
                relativeRisk = "变低";
                _color = '#00cc00';
            }
            if (CheckData.relativeRisk == 2) {
                relativeRisk = "变高";
                _color = '#cc3300';
            }
            var WXData = {
                "touser": userInfo.openid,
                "template_id": process.env.WeChat_TakeCheckID,
                "data": {
                    "first": {
                        "value": "手环测量结果推送",
                    },
                    "keyword1": {
                        "value": userInfo.name
                    },
                    "keyword2": {
                        "value": "\r\n  心率：" + CheckData.hrCount + "\r\n  血压：" + CheckData.highPress + "/" + CheckData.lowPress + "\r\n   PWV：" + CheckData.pwv + "\r\n   硬化风险：" + relativeRisk,
                        color: _color
                    },
                    "keyword3": {
                        "value": "曼康云"
                    },
                    "keyword4": {
                        "value": CheckData.testTime
                    },
                    "remark": {
                        "value": "曼康云-祝你健康每一天"
                    }
                }
            }
            self_sendWX(_accesstoken, WXData);
        }, function (err) {
            console.log(err);
        });
    }

    self_sendWX = function (_accesstoken, WXData) {
        EWTRACEIFY(WXData);
        url = "https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=" + _accesstoken;
        needle.post(encodeURI(url), WXData, { json: true }, function (err, resp) {
            // you can pass params as a string or as an object.
            if (err) {
                //cb(err, { status: 0, "result": "" });
                console.log(err);
            }
            else {
                EWTRACEIFY(resp.body);
            }
        });
    }

    Request_WxToken = function () {
        return new Promise(function (resolve, reject) {
            require('dotenv').config({ path: './config/.env' });
            var tokenUrl = 'http://style.man-kang.com:3000/token?appId=' + process.env.WX_APP_ID;
            var IP = getIPAdress();
            if (IP.indexOf('172.19') >= 0) {
                tokenUrl = 'http://0.0.0.0:3000/token/token?appId=' + process.env.WX_APP_ID;
            }
            var needle = require('needle');
            needle.get(encodeURI(tokenUrl), null, function (err, resp) {
                // you can pass params as a string or as an object.
                if (err) {
                    reject(err);
                }
                else {
                    if (!_.isUndefined(resp.headers.errcode)) {
                        reject(new Error(resp.headers.errmsg));
                    }
                    else {
                        resolve(resp);
                    }
                }
            });
        });
    }

    Request_WxToken_dangtang = function () {
        return new Promise(function (resolve, reject) {
            var _appie = 'wx012a9130903a7396';
            require('dotenv').config({ path: './config/.env' });
            var tokenUrl = 'http://style.man-kang.com:3000/token?appId=' + _appie;
            var IP = getIPAdress();
            if (IP.indexOf('172.19') >= 0) {
                tokenUrl = 'http://0.0.0.0:3000/token/token?appId=' + _appie;
            }
            var needle = require('needle');
            needle.get(encodeURI(tokenUrl), null, function (err, resp) {
                // you can pass params as a string or as an object.
                if (err) {
                    reject(err);
                }
                else {
                    if (!_.isUndefined(resp.headers.errcode)) {
                        reject(new Error(resp.headers.errmsg));
                    }
                    else {
                        resolve(resp);
                    }
                }
            });
        });
    }

    fillUpdateSQL = function (result, name) {
        if (!_.isUndefined(result[name])) {
            return SQL = " " + name + " = '" + result[name] + "',";
        }
        return "";
    }


    SendNotifyContext = function (openid, context) {
        Request_WxToken().then(function (resp) {

            var url = "https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=" + resp.body.access_token;;

            var SendData = {
                "touser": openid,
                "msgtype": "text",
                "text":
                {
                    "content": context
                }
            };
            self_sendWX(resp.body.access_token, SendData);
        });
    }
}