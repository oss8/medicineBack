'use strict';

module.exports = function(Alnotify) {
    Alnotify.alnotify = function (a, cb) {
        console.log(a);
        var oo = {};
        oo.ordersId = a.out_trade_no;
        oo.trade_status = a.trade_status;
        oo.map = a;
        oo.payType = "alipayWeb";

        var param = JSON.stringify(oo);
        var status = "fail";

        // console.log(a.trade_status);
        if (oo.trade_status == "TRADE_SUCCESS") {

            var dataSource_brand = Alnotify.app.datasources.commondb;
            status = "success";

            var bsSQL = "update cd_orders set status = 'commit' where payid = '" + oo.ordersId + "'";

            DoSQL(bsSQL, dataSource_brand).then(function () {
                cb(null, status, 'text/plain; charset=utf-8');
            }, function (err) {
                cb(null, status, 'text/plain; charset=utf-8');
            })

        }
        
    }

    Alnotify.remoteMethod(
        'alnotify',
        {
            accepts: [
                {
                    arg: 'a', type: 'object',
                    http: function (ctx) {
                        var req = ctx.req;
                        return req.body;
                    }
                }
            ],
            returns: [{ arg: 'body', type: 'file', root: true }, { arg: 'Content-Type', type: 'string', http: { target: 'header' } }],
            http: { verb: 'post' }
        }
    );


};
