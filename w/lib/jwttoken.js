var fs = require('fs');
var jwt = require('jsonwebtoken');
var cert = fs.readFileSync('./jwt_rsa_private_key.pem');
var pubcert = fs.readFileSync('./jwt_rsa_public_key.pem');
module.exports = function () {
    return{
        encode: function(payload, cb){
            return new Promise((resolve, reject) => {
                var option = { algorithm: 'RS256'};
                if(!payload.exp){
                    option.expiresIn = '1d';
                }
                jwt.sign(payload, cert, option, function (err, token) {
                    cb && cb(err, token);
                    if (err) {
                        reject(err);
                    } else {
                        resolve(token);
                    }
                });
            });
        },
        decode: function (token, cb) {
            return new Promise((resolve, reject) => {
                jwt.verify(token, pubcert, { algorithms: ['RS256'] }, function (err, payload) {
                    cb && cb(err, payload);
                    if (err) {
                        reject(err);
                    } else {
                        resolve(payload);
                    }
                });
            });
        }        
    }
}