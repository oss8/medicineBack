'use strict';

module.exports = function (Doctor) {

    var app = require('../../server/server');
    app.DisableSystemMethod(Doctor);
    var _ = require('underscore');
    var uuid = require('node-uuid');

    Doctor.AddDoctor = function (AddDoctor, cb) {
        EWTRACE("AddDoctor Begin");

        var bsSQL = "select * from hh_sendsms where mobile = '" + AddDoctor.mobile + "' and randcode = " + AddDoctor.randcode;

        DoSQL(bsSQL).then(function (result) {

            if (result.length == 0) {
                cb(null, { status: 0, "result": "验证码错误" });
            } else {
                bsSQL = "delete from hh_sendsms where mobile = '" + AddDoctor.mobile + "' and randcode = " + AddDoctor.randcode + ";INSERT INTO hh_publicUser (userid, mobile,  randCode, status, type,name) VALUES (uuid(),'" + AddDoctor.mobile + "', '" + AddDoctor.password + "', 0,1,'" + AddDoctor.name + "');";
                DoSQL(bsSQL).then(function (result) {
                    cb(null, { status: 1, "result": "" });
                    EWTRACE("AddDoctor End");
                }, function (err) {
                    cb(null, { status: 0, "result": err.message });
                    EWTRACE("AddDoctor End");
                    return;
                });
            }
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Doctor.remoteMethod(
        'AddDoctor',
        {
            http: { verb: 'post' },
            description: '添加医生',
            accepts: { arg: 'AddDoctor', type: 'object', description: '{"mobile":"","randcode":"","password":"","name":""}' },
            returns: { arg: 'AddDoctor', type: 'object', root: true }
        }
    );

    Doctor.DoctorGetRandCode = function (DoctorGetRandCode, cb) {
        EWTRACE("DoctorGetRandCode Begin");

        var bsSQL = "select usp_NewRandomNumber(4) as rand;";

        DoSQL(bsSQL).then(function (result) {
            bsSQL = "delete from hh_sendsms where mobile = '" + DoctorGetRandCode.mobile + "';";
            bsSQL += "insert into hh_sendsms(mobile,randcode) values('" + DoctorGetRandCode.mobile + "'," + result[0].rand + ");";

            DoSQL(bsSQL).then(function () {
                var smspv = SendSMS(DoctorGetRandCode.mobile, result[0].rand);
                smspv.then(function () {

                    cb(null, { status: 1, "result": "" });
                    EWTRACE("DoctorGetRandCode End");
                }, function (err) {
                    cb(null, { status: 0, "result": err.message });
                    EWTRACE("DoctorGetRandCode End");
                    return;
                });
            }, function (err) {
                cb(err, { status: 0, "result": "" });
            });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Doctor.remoteMethod(
        'DoctorGetRandCode',
        {
            http: { verb: 'post' },
            description: '医生获取验证码',
            accepts: { arg: 'DoctorGetRandCode', type: 'object', description: '{"mobile":""}' },
            returns: { arg: 'DoctorGetRandCode', type: 'object', root: true }
        }
    );

    Doctor.DoctorLogin = function (DoctorLogin, cb) {
        EWTRACE("DoctorLogin Begin");

        var bsSQL = "select * from hh_publicuser where mobile = '" + DoctorLogin.mobile + "' and type = 1 and randcode = '" + DoctorLogin.password + "'";

        DoSQL(bsSQL).then(function (result) {

            if (result.length == 0) {

                cb(null, { status: 0, "result": "用户不存在" });
            }
            else {
                cb(null, { status: 1, "result": result[0] });
            }

        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Doctor.remoteMethod(
        'DoctorLogin',
        {
            http: { verb: 'post' },
            description: '医生登录',
            accepts: { arg: 'DoctorLogin', type: 'object', description: '{"mobile":"18958064659","password":""}' },
            returns: { arg: 'DoctorLogin', type: 'object', root: true }
        }
    );

    Doctor.RequestPatientList = function (RequestPatientList, cb) {
        EWTRACE("RequestPatientList Begin");

        var bsSQL = "select a.*,b.lastfollowuptime, b.lastfollowupcontext from hh_publicUser a, hh_doctorpatient b where b.patientid = a.id and b.doctorid = '"+RequestPatientList .doctorid+"'";
        
        DoSQL(bsSQL).then(function(result){
            cb(null, { status: 1, "result": result });
        },function(err){
            cb(err, { status: 0, "result": "" });
        });
    }

    Doctor.remoteMethod(
        'RequestPatientList',
        {
            http: { verb: 'post' },
            description: '获得对应医生的病人列表',
            accepts: { arg: 'RequestPatientList', type: 'object', description: '{"doctorid":"18958064659"}' },
            returns: { arg: 'RequestPatientList', type: 'object', root: true }
        }
    );

    Doctor.AddPatient = function (AddPatient, cb) {
        EWTRACE("AddPatient Begin");

        var ps = [];
        var _patientid = "";
        if ( !_.isEmpty(AddPatient.patientid )){
            _patientid = AddPatient.patientid;
        }
        var bsSQL = "select * from hh_publicUser where id = '" + _patientid + "' and type = 0";
        var _patientInfo = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _patientInfo));

        bsSQL = "select * from hh_doctorpatient where doctorid = '" + AddPatient.doctorid + "'";
        var _DoctorpatientInfo = {};
        ps.push(ExecuteSyncSQLResult(bsSQL, _DoctorpatientInfo));

        Promise.all(ps).then(function () {

            var _uuid = "";
            if (_patientInfo.Result.length == 0) {
                _uuid = uuid.v4();
                bsSQL = "INSERT INTO hh_publicUser (userid, mobile, cardNo, medicalNo, status, name, type, sex, casetype, province, city, region, address, birthday) VALUES ('" + _uuid + "', '" + AddPatient.pmobile + "', '" + AddPatient.pcardno + "','"+AddPatient.pmedicalNo+"',  0,  '" + AddPatient.pname + "', 0, " + AddPatient.psex + ", '" + AddPatient.casetype + "', '" + AddPatient.province + "', '" + AddPatient.city + "', '" + AddPatient.region + "', '" + AddPatient.address + "','"+ AddPatient.birthday+"');";
            } else {
                _uuid = _patientInfo.Result[0].id;
                bsSQL = "update hh_publicuser set name = '" + AddPatient.pname + "', cardNo = '" + AddPatient.pcardno + "',sex ='" + AddPatient.psex + "',casetype = '" + AddPatient.casetype + "',province='" + AddPatient.province + "',city='" + AddPatient.city + "',region='" + AddPatient.region + "',address='" + AddPatient.address + "',mobile = '" + AddPatient.pmobile + "',birthday = '"+ AddPatient.birthday +"' where userid = '"+ _uuid +"';";
            }

            var find = _.find(_DoctorpatientInfo.Result, function (detail) {
                return detail.patientid == _uuid;
                
            });

            if (_.isEmpty(find)) {
                bsSQL += "insert into hh_doctorpatient(doctorid,patientid) values('" + AddPatient.doctorid + "','" + _uuid + "')";
            }
            DoSQL(bsSQL).then(function () {
                cb(null, { status: 1, "result": "" });
            }, function (err) {
                cb(err, { status: 0, "result": err.message });
            })
        }, function (err) {
            cb(err, { status: 0, "result": err.message });
        });
    }

    Doctor.remoteMethod(
        'AddPatient',
        {
            http: { verb: 'post' },
            description: '添加病人',
            accepts: { arg: 'AddPatient', type: 'object', description: '{"patientid":"","doctorid":"123","pmobile":"13857194279","pcardno":"","pmedicalNo":"","pname":"","psex":"0","province":"","city":"","region":"","address":"","casetype":"0","birthday":""}' },
            returns: { arg: 'AddPatient', type: 'object', root: true }
        }
    );


    Doctor.RequestPantientFollow = function (RequestPantientFollow, cb) {
        EWTRACE("RequestPantientFollow Begin");

        var bsSQL = "select addtime,context from hh_followup where id = '" + RequestPantientFollow.pantientid + "' order by addtime2 desc limit 12";

        DoSQL(bsSQL).then(function (result) {

            cb(null, { status: 1, "result": result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Doctor.remoteMethod(
        'RequestPantientFollow',
        {
            http: { verb: 'post' },
            description: '查询病人随访内容',
            accepts: { arg: 'RequestPantientFollow', type: 'object', description: '{"pantientid":""}' },
            returns: { arg: 'RequestPantientFollow', type: 'object', root: true }
        }
    );

    Doctor.AddPantientFollow = function (AddPantientFollow, cb) {
        EWTRACE("AddPantientFollow Begin");

        var bsSQL = "insert into hh_followup (id,addtime,addtime2,context) values('" + AddPantientFollow.pantientid + "',now(), UNIX_TIMESTAMP(now()),'" + AddPantientFollow.context + "');";

        bsSQL += "update hh_doctorpatient set lastfollowuptime = now(), lastfollowupcontext = '" + AddPantientFollow.context + "' where patientid = '" + AddPantientFollow.pantientid + "' and doctorid = '" + AddPantientFollow.doctorid + "';"

        DoSQL(bsSQL).then(function () {

            cb(null, { status: 1, "result": "" });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    }

    Doctor.remoteMethod(
        'AddPantientFollow',
        {
            http: { verb: 'post' },
            description: '添加患者随访内容',
            accepts: { arg: 'AddPantientFollow', type: 'object', description: '{"doctorid":"","pantientid":"","context":""}' },
            returns: { arg: 'AddPantientFollow', type: 'object', root: true }
        }
    );
};


