var path = require('path'),
fs = require("fs");
exports.privateKey = fs.readFileSync(path.join(__dirname, './private/car.eshine.cn_key')).toString();
exports.certificate = fs.readFileSync(path.join(__dirname, './private/car.eshine.cn.crt')).toString();