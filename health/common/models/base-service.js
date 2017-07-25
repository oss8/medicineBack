'use strict';

module.exports = function (Baseservice) {

    var app = require('../../server/server');
    app.DisableSystemMethod(Baseservice);
    var _ = require('underscore');

    Baseservice.CheckOpenID = function (CheckOpenID, cb) {
        EWTRACE("CheckOpenID Begin");

        var bsSQL = "select * from hh_publicuser where openid = '" + CheckOpenID.openid + "'";

        DoSQL(bsSQL).then(function (result) {
            if (result.length == 0) {
                cb(null, { status: 0, "result": "" });
            }
            else {
                cb(null, { status: 1, "result": "" });
            }
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Baseservice.remoteMethod(
        'CheckOpenID',
        {
            http: { verb: 'post' },
            description: '',
            accepts: { arg: 'CheckOpenID', type: 'object', description: '{"openid":""}' },
            returns: { arg: 'CheckOpenID', type: 'object', root: true }
        }
    );


    Baseservice.RegPublicUser = function (RegPublicUser, cb) {
        EWTRACE("RegPublicUser Begin");

        var bsSQL = "select * from hh_publicuser where mobile = '" + RegPublicUser.mobile + "' and randCode = '" + RegPublicUser.randcode + "'";

        DoSQL(bsSQL).then(function (result) {

            if (result.length == 0) {
                cb(err, { status: 0, "result": "验证码错误" });
            } else {
                var _openid = null;
                var OpenID = {};
                try {
                    OpenID = GetOpenIDFromToken(RegPublicUser.token);
                    _openid = OpenID.openid;

                    bsSQL = "update hh_publicuser set openid = '" + _openid + "' where mobile = '" + RegPublicUser.mobile + "'";
                    DoSQL(bsSQL).then(function(){
                        cb(null, { status: 1, "result": "绑定成功！" });
                    },function(err){
                        cb(err, { status: 0, "result": "" });
                    })
                }
                catch (err) {
                    EWTRACE(err.message);
                    cb(err, { status: 0, "result": err.message });
                    EWTRACE("RegPublicUser End");
                    return;
                }
            }
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Baseservice.remoteMethod(
        'RegPublicUser',
        {
            http: { verb: 'post' },
            description: '注册普通用户(op_smscode)',
            accepts: { arg: 'RegPublicUser', type: 'object', description: '{"mobile":"18958064659","randcode":"","token":""}' },
            returns: { arg: 'RegPublicUser', type: 'object', root: true }
        }
    );


    Baseservice.PublicUserGetRand = function (PublicUserGetRand, cb) {
        EWTRACE("PublicUserGetRand Begin");

        var bsSQL = "select * from hh_publicuser where mobile = '" + PublicUserGetRand.mobile + "'";

        DoSQL(bsSQL).then(function (result) {

            if (result.length == 0) {
                bsSQL = "INSERT INTO hh_publicUser (id, mobile,  randCode, status, type) VALUES (uuid(),'" + PublicUserGetRand.mobile + "', 8888, 0,0);";
                DoSQL(bsSQL).then(function () {

                    var smspv = SendSMS(PublicUserGetRand.mobile, '8888');
                    smspv.then(function () {

                        cb(null, { status: 1, "result": "" });
                        EWTRACE("PublicUserGetRand End");
                    }, function (err) {
                        cb(null, { status: 0, "result": err.message });
                        EWTRACE("PublicUserGetRand End");
                        return;
                    });
                }, function (err) {
                    cb(err, { status: 0, "result": "" });
                });
            }
            else {

                bsSQL = "select usp_NewRandomNumber(4) as rand;";
                DoSQL(bsSQL).then(function (result) {

                    var smspv = SendSMS(PublicUserGetRand.mobile, result[0].rand);
                    smspv.then(function () {
                        bsSQL = "update hh_publicUser set randCode = " + result[0].rand + " where mobile = '" + PublicUserGetRand.mobile + "'";
                        DoSQL(bsSQL).then(function (result) {
                            cb(null, { status: 1, "result": "" });
                            EWTRACE("PublicUserGetRand End");
                        })
                    }, function (err) {
                        cb(null, { status: 0, "result": err.message });
                        EWTRACE("PublicUserGetRand End");
                        return;
                    });
                }, function (err) {
                    cb(err, { status: 0, "result": "" });
                });
            }

        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Baseservice.remoteMethod(
        'PublicUserGetRand',
        {
            http: { verb: 'post' },
            description: '普通用户获取登录随机码(op_smscode)',
            accepts: { arg: 'PublicUserGetRand', type: 'object', description: '{"mobile":"18958064659"}' },
            returns: { arg: 'PublicUserGetRand', type: 'object', root: true }
        }
    );

    Baseservice.PublicUserInputDetailCode = function (PublicUserInputDetailCode, cb) {
        EWTRACE("PublicUserInputDetailCode Begin");

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(PublicUserInputDetailCode.token);
            _openid = OpenID.openid;
        }
        catch (err) {
            EWTRACE(err.message);
            cb(err, { status: 0, "result": err.message });
            EWTRACE("PublicUserInputDetailCode End");
            return;
        }

        var bsSQL = "select * from hh_publicuser where openid = '" + _openid + "'";

        DoSQL(bsSQL).then(function (result) {

            if (result.length == 0 || (_.isEmpty(PublicUserInputDetailCode.cardNo) && _.isEmpty(PublicUserInputDetailCode.medicalNo))) {
                cb(null, { status: 0, "result": "找不到用户" });
            }
            else {
                var _update = "";
                if (!_.isEmpty(PublicUserInputDetailCode.cardNo)) {
                    _update += " cardNo = '" + PublicUserInputDetailCode.cardNo + "',";
                }
                if (!_.isEmpty(PublicUserInputDetailCode.medicalNo)) {
                    _update = "medicalNo = '" + PublicUserInputDetailCode.medicalNo + "',";
                }

                if (_update.length > 1) {
                    _update = _update.substring(0, _update.length - 1);
                    bsSQL = "update hh_publicUser set " + _update + " where openid = '" + _openid + "'";
                    DoSQL(bsSQL).then(function () {
                        cb(null, { status: 1, "result": "" });
                    }, function (err) {
                        cb(err, { status: 1, "result": err.message });
                    });
                }
                else {
                    cb(null, { status: 1, "result": "" });
                }
            }
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Baseservice.remoteMethod(
        'PublicUserInputDetailCode',
        {
            http: { verb: 'post' },
            description: '普通用户更新身份证、病历号(op_smscode)',
            accepts: { arg: 'PublicUserInputDetailCode', type: 'object', description: '{"cardNo":"","medicalNo":"","token":""}' },
            returns: { arg: 'PublicUserInputDetailCode', type: 'object', root: true }
        }
    );


    Baseservice.PublicUserLogin = function (PublicUserLogin, cb) {
        EWTRACE("PublicUserLogin Begin");

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(PublicUserLogin.token);
            _openid = OpenID.openid;
        }
        catch (err) {
            EWTRACE(err.message);
            cb(err, { status: 0, "result": err.message });
            EWTRACE("PublicUserLogin End");
            return;
        }
        // _openid = 'oROpyw64xys168PYZVdfBL9T0WyA';

        var bsSQL = "select * from hh_publicuser where openid = '" + _openid + "'";

        DoSQL(bsSQL).then(function (result) {

            if (result.length == 0) {
                cb(null, { status: 0, "result": "找不到用户" });
            }
            else {
                var userInfo = result[0];
                if (!userInfo.cardNo || !userInfo.medicalNo) {
                    cb(null, { status: 2, "result": result[0] });
                } else {
                    cb(null, { status: 1, "result": result[0] });
                }

            }

        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Baseservice.remoteMethod(
        'PublicUserLogin',
        {
            http: { verb: 'post' },
            description: '普通用户获取个人信息',
            accepts: { arg: 'PublicUserLogin', type: 'object', description: '{"token":"18958064659"}' },
            returns: { arg: 'PublicUserLogin', type: 'object', root: true }
        }
    );

    Baseservice.RequestMyQRCode = function (RequestMyQRCode, cb) {
        EWTRACE("RequestMyQRCode Begin");

        var bsSQL = "select id from hh_publicuser where od = '" + RequestMyQRCode.id + "'";

        DoSQL(bsSQL).then(function (result) {

            if (result.length == 0) {
                cb(null, { status: 0, "result": "找不到用户" });
            }
            else {
                cb(null, { status: 1, "result": result[0] });
            }

        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Baseservice.remoteMethod(
        'RequestMyQRCode',
        {
            http: { verb: 'post' },
            description: '获取个人二维码()',
            accepts: { arg: 'RequestMyQRCode', type: 'object', description: '{"id":"18958064659"}' },
            returns: { arg: 'RequestMyQRCode', type: 'object', root: true }
        }
    );


    Baseservice.AddPatientContact = function (AddPatientContact, cb) {
        EWTRACE("AddPatientContact Begin");

        var bsSQL = "select id from hh_publicuser where id = '" + AddPatientContact.id + "'";

        DoSQL(bsSQL).then(function (result) {

            if (result.length == 0) {
                cb(null, { status: 0, "result": "找不到用户" });
            }
            else {

                bsSQL = "update hh_publicuser set contactmobile = '" + AddPatientContact.contactmobile + "', contactname = '" + AddPatientContact.contactname + "' where id = '" + AddPatientContact.id + "';"
                DoSQL(bsSQL).then(function () {
                    cb(null, { status: 1, "result": "" });
                }, function (err) {
                    cb(err, { status: 0, "result": err.message });
                });

            }

        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Baseservice.remoteMethod(
        'AddPatientContact',
        {
            http: { verb: 'post' },
            description: '病人添加紧急联系人',
            accepts: { arg: 'AddPatientContact', type: 'object', description: '{"id":"18958064659","contactmobile":"","contactname":""}' },
            returns: { arg: 'AddPatientContact', type: 'object', root: true }
        }
    );

    Baseservice.RequestPatientFollow = function (RequestPatientFollow, cb) {
        EWTRACE("RequestPatientFollow Begin");

        var bsSQL = "select id from hh_publicuser where id = '" + RequestPatientFollow.id + "'";

        DoSQL(bsSQL).then(function (result) {

            if (result.length == 0) {
                cb(null, { status: 0, "result": "找不到用户" });
            }
            else {

                bsSQL = "select addtime,context from hh_followup where id = '" + result[0].id + "' order by addtime desc limit 12;"
                DoSQL(bsSQL).then(function (result1) {
                    cb(null, { status: 1, "result": result1 });
                }, function (err) {
                    cb(err, { status: 0, "result": err.message });
                });

            }

        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Baseservice.remoteMethod(
        'RequestPatientFollow',
        {
            http: { verb: 'post' },
            description: '病人查看随访记录',
            accepts: { arg: 'RequestPatientFollow', type: 'object', description: '{"id":"18958064659"}' },
            returns: { arg: 'RequestPatientFollow', type: 'object', root: true }
        }
    );
};
