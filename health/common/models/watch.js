'use strict';

module.exports = function (Watch) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Watch);
    var _ = require('underscore');
    var uuid = require('node-uuid');
    var needle = require('needle');

    Watch.CreateWXMenu = function ( cb) {
        EWTRACE("CreateWXMenu Begin");

        var tokenUrl = 'http://106.14.159.108:2567/token';
        var needle = require('needle');

        needle.get(encodeURI(tokenUrl), null, function (err, resp) {

            if (err) {
                cb(err, { status: 0, "result": "" });
            }
            else {


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
                            "type":"click",
                            "name":"SOS",
                            "key":"SOS_Notify"
                       }
                    ]
                }

                var url = "https://api.weixin.qq.com/cgi-bin/menu/create?access_token=" + resp.body.access_token;

                needle.post(encodeURI(url), data, {json:true}, function (err, resp) {
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
            }
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

    Watch.RequestUserInfo = function ( cb) {
        EWTRACE("RequestUserInfo Begin");

        var exec = require('child_process').exec; 
        var cmdStr = "pm2 restart wx-token";
        exec(cmdStr, function(err,stdout, stderr){

            if ( err ){
                EWTRACE(err.message)
            }
            else{
                EWTRACE(stdout);
            }
        });
    }    

    Watch.remoteMethod(
        'RequestUserInfo',
        {
            http: { verb: 'post' },
            description: '创建微信菜单',
            returns: { arg: 'AddDoctor', type: 'object', root: true }
        }
    );

};
