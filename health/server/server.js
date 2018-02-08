'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
var xmlparser = require('express-xml-bodyparser');

var https = require('https');
var http = require('http');
var sslConfig = require('./ssl-config');
var _ = require('underscore');
var app = module.exports = loopback();
var config = require('../config/config')
app.start = function() {
    // start the web server
    return app.listen(function() {
        app.emit('started');
        var baseUrl = app.get('url').replace(/\/$/, '');
        console.log('Web server listening at: %s', baseUrl);
        if (app.get('loopback-component-explorer')) {
            var explorerPath = app.get('loopback-component-explorer').mountPath;
            console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
        }
    });
};

app.use(xmlparser());

// app.use(utils.sign(config));
app.DisableSystemMethod = function(_basemodel) {
    _basemodel.disableRemoteMethodByName("create", true);
    _basemodel.disableRemoteMethodByName("upsert", true);
    _basemodel.disableRemoteMethodByName("updateAll", true);
    _basemodel.disableRemoteMethodByName("updateAttributes", false);

    _basemodel.disableRemoteMethodByName("find", true);
    _basemodel.disableRemoteMethodByName("findById", true);
    _basemodel.disableRemoteMethodByName("findOne", true);

    _basemodel.disableRemoteMethodByName("replaceById", true);
    _basemodel.disableRemoteMethodByName("createChangeStream", true);
    _basemodel.disableRemoteMethodByName("upsertWithWhere", true);
    _basemodel.disableRemoteMethodByName("replaceOrCreate", true);
    _basemodel.disableRemoteMethodByName("deleteById", true);
    _basemodel.disableRemoteMethodByName("getId", true);

    _basemodel.disableRemoteMethodByName("confirm", true);
    _basemodel.disableRemoteMethodByName("count", true);
    _basemodel.disableRemoteMethodByName("exists", true);
    _basemodel.disableRemoteMethodByName("resetPassword", true);

    _basemodel.disableRemoteMethodByName('__count__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__create__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__delete__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__destroyById__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__findById__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__get__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__updateById__accessTokens', false);
};
// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.

var net = require('net');
var HOST = '192.168.6.165';
var PORT = 6801;



function Str2Bytes(str) {
    var pos = 0;
    var len = str.length;
    if (len % 2 != 0) {
        return null;
    }
    len /= 2;
    var hexA = new Array();
    for (var i = 0; i < len; i++) {
        var s = str.substr(pos, 2);
        var v = parseInt(s, 16);
        hexA.push(v);
        pos += 2;
    }
    return hexA;
}


function Bytes2Str(arr) {
    var str = "";
    for (var i = 0; i < arr.length; i++) {
        var tmp = arr[i].toString(16);
        if (tmp.length == 1) {
            tmp = "0" + tmp;
        }
        str += tmp;
    }

    str = str.toUpperCase();
    var _RecvList = [];
    for (var i = 0; i < str.length; i += 2) {
        _RecvList.push(str.substr(i, 2));
    }

    var CheckList = [];
    for (var i = 0; i < _RecvList.length; i++) {
        var _tmp = _RecvList[i];
        if (_tmp != "F0") {
            CheckList.push(_tmp);
        }
        else {
            CheckList.push("F" + _RecvList[i + 1].substr(1, 1));
            i++;
        }
    }

    return CheckList.join("");
}

var socketList = [];

function contains(sock, list, obj){

    var iIndex = list.length
    while( iIndex-- ){
        if ( list[iIndex].remoteAddress == sock.remoteAddress && list[iIndex].remotePort == sock.remotePort){
            return iIndex;
        }
    }
}

function convert2Hex(){
    var result = [];
    result.push('8A00');
    result.push('0111');

    var _check = 0;
    result.forEach(function(item) {
        _check += parseInt(item, 16);
    })
    var _Orcheck = 65535 - _check % 65536;

    // 拼装成完整字符串
    var _outstring = _Orcheck.toString(16).toUpperCase() + result.join("");

    var _outstring = '8A0001119A';
}


net.createServer(function(sock) {

    convert2Hex()

    // 我们获得一个连接 - 该连接自动关联一个socket对象
    console.log('CONNECTED: ' +
        sock.remoteAddress + ':' + sock.remotePort);
    app.set('publicSocket', sock);

    var socketClient = {};
    socketClient.remoteAddress = sock.remoteAddress;
    socketClient.remotePort = sock.remotePort;
    socketClient.userSocket = sock;

    socketList.push(socketClient);

    // 为这个socket实例添加一个"data"事件处理函数
    sock.on('data', function(data) {
        console.log('socketLength'+ socketList.length +',DATA ' + sock.remoteAddress + ': ' + Bytes2Str(data));

        var RecvData = Bytes2Str(data);
        var _out = new Buffer(Str2Bytes(RecvData));
        sock.write(_out);

        var _buffer = new Buffer('8A0001119B');
        sock.write(_buffer);
    });

    // 为这个socket实例添加一个"close"事件处理函数
    sock.on('close', function(data) {
        console.log(new Date().toTimeString() + ':CLOSED: ' +
            sock.remoteAddress + ' ' + sock.remotePort);
        var find = {};
        find.remoteAddress = sock.remoteAddress;
        find.remotePort = sock.remotePort;

        var iIndex = contains(sock, socketList, find);

        socketList.splice(iIndex, 1);
    });

    sock.on('error', function(err) {
        console.log(new Date().toTimeString() + ':ERROR: ' + err.message);
    });

}).listen(PORT);



app.start = function(httpOnly) {
    // start the web server
    if (httpOnly === undefined) {
        httpOnly = process.env.HTTP;
    }
    var server = null;
    if (!httpOnly) {
        var options = {
            key: sslConfig.privateKey,
            cert: sslConfig.certificate,
        };
        server = https.createServer(options, app);
    } else {
        server = http.createServer(app);
    }

    var os = require('os');

    console.log('This platform is ' + os.platform());
    var _port = app.get('port');

    // if (os.platform() == 'darwin') {
    //     _port = 6800;
    // }
    server.listen(_port, function() {
        //  server.listen(6800, function() {       
        var baseUrl = (httpOnly ? 'http://' : 'https://') + app.get('host') + ':' + _port;
        app.emit('started', baseUrl);
        console.log('LoopBack server listening @ %s%s', baseUrl, '/explorer');
    });

    return server;
};


boot(app, __dirname, function(err) {
    if (err) throw err;

    // start the server if `$ node server.js`
    if (require.main === module)
        try {
            app.start(true);
        }
    catch (err) {
        EWTRACEIFY(err);
    }Str2Bytes
});