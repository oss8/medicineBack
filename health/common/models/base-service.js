'use strict';

module.exports = function (Baseservice) {

    var app = require('../../server/server');
    app.DisableSystemMethod(Baseservice);
    var _ = require('underscore');

    Baseservice.CheckOpenID = function (CheckOpenID, cb) {
        EWTRACE("CheckOpenID Begin");

        var bsSQL = "select * from hh_publicuser where openid = '" + CheckOpenID.openid + "'";

        DoSQL(bsSQL).then(function (result) {
            if ( result.length == 0 ){
                cb(null, { status: 0, "result": "" });
            }
            else{
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

            cb(null, { status: 1, "result": result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Baseservice.remoteMethod(
        'RegPublicUser',
        {
            http: { verb: 'post' },
            description: '注册普通用户(op_smscode)',
            accepts: { arg: 'RegPublicUser', type: 'object', description: '{"mobile":"18958064659","randcode":""}' },
            returns: { arg: 'RegPublicUser', type: 'object', root: true }
        }
    );


    Baseservice.PublicUserGetRand = function (PublicUserGetRand, cb) {
        EWTRACE("PublicUserGetRand Begin");

        var bsSQL = "select * from hh_publicuser where mobile = '" + PublicUserGetRand.mobile + "'";

        DoSQL(bsSQL).then(function (result) {

            if (result.length == 0) {
                bsSQL = "INSERT INTO hh_publicUser (id, mobile,  randCode, status) VALUES (uuid(),'" + PublicUserGetRand.mobile + "', 8888, 0 );";
                DoSQL(bsSQL).then(function (result) {

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

                    var smspv = SendSMS(PublicUserGetRand.mobile, result.rand);
                    smspv.then(function () {
                        bsSQL = "update hh_publicUser set randCode = " + result.rand + " where mobile = '" + PublicUserGetRand.mobile + "'";
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

        var bsSQL = "select * from hh_publicuser where mobile = '" + PublicUserInputDetailCode.mobile + "'";

        DoSQL(bsSQL).then(function (result) {

            if ( result.length == 0 || ( _.isEmpty(PublicUserInputDetailCode.cardNo) && _.isEmpty(PublicUserInputDetailCode.medicalNo))){
                cb( null, { status: 0, "result": "找不到用户" });
            }
            else{
                var _updateCardNo = "";
                if ( ! _.isEmpty(PublicUserInputDetailCode.cardNo)){
                    _updateCardNo = " cardNo = '" + PublicUserInputDetailCode.cardNo + "'";
                }
                var _updateMedicalNo = "";
                if ( ! _.isEmpty(PublicUserInputDetailCode.medicalNo)){
                    _updateMedicalNo = "medicalNo = '" + PublicUserInputDetailCode.medicalNo + "'";
                }

                bsSQL = "update hh_publicUser set "+ _updateCardNo + _updateCardNo.length > 0?",":"" + _updateMedicalNo + " where mobile = '" + PublicUserInputDetailCode.mobile + "'";
                DoSQL(bsSQL).then(function(){
                    cb( null, { status: 1, "result": "" });
                },function(err){
                    cb( err, { status: 1, "result": err.message });
                });
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
            accepts: { arg: 'PublicUserInputDetailCode', type: 'object', description: '{"mobile":"18958064659","cardNo":"","medicalNo":""}' },
            returns: { arg: 'PublicUserInputDetailCode', type: 'object', root: true }
        }
    );    
};
