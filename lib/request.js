'use strict';

var _ = require('busyman'),
    debug = require('debug')('mqtt-node:request'),
    CNST = require('./constants');

var request = {};

request.register = function (qn, callback) {
    var objectList = qn.getSmartObject().objectList(),
        data = {
            transId: null,
            lifetime: qn.lifetime,
            objList: {},
            ip: qn.ip,
            mac: qn.mac,
            version: qn.version
        };

    _.forEach(objectList, function (rec) {
        data.objList[rec.oid] = rec.iid;
    });

    return req(qn, 'register', data, function (err, rsp) {
        if (!err && rsp.status === 201) {   // Created
            process.nextTick(function () {
                qn.emit('registered');
            });
        }
        callback(err, rsp);
    });
};

request.deregister = function (qn, callback) {
    return req(qn, 'deregister', { transId: null }, function (err, rsp) {
        if (!err) {
            if (rsp.status === CNST.RSP.deleted) {
                qn.close(false, function () {
                    process.nextTick(function () {
                        qn.emit('deregistered');
                    });
                    callback(null, rsp);
                });
            } else {
                qn.close(true, function () {
                    callback(null, rsp);
                });
            }
        } else {
            callback(err);
        }
    });
};

request.checkin = function (qn, callback) {
    return req(qn, 'schedule', { transId: null, sleep: false }, callback);
};

request.checkout = function (qn, duration, callback) {
    return req(qn, 'schedule', { transId: null, sleep: true, duration: duration  }, callback);
};

request.update = function (qn, devAttrs, callback) {
    // Change of mac address and clientId at runtime will be ignored
    return req(qn, 'update', _.omit(devAttrs, [ 'mac', 'clientId' ]), callback);
};

request.notify = function (qn, data, callback) {
    return req(qn, 'notify', data, function (err, rsp) {
        if (rsp && rsp.cancel)
            qn.disableReport(data.oid, data.iid, data.rid);

        if (_.isFunction(callback))
            callback(err, rsp);
    });
};

request.ping = function (qn, callback) {
    var txTime = _.now(),
        data = {
            transId: null
        };

    return req(qn, 'ping', data, function (err, rsp) {
        if (!err && rsp.status !== CNST.RSP.timeout)
            rsp.data = _.now() - txTime;    // rxTime - txTime

        if (_.isFunction(callback))
            callback(err, rsp);
    });
};

function reqTimeout(qn, key, delay) {
    delay = delay || 10000; // default to 10 secs if not given
    qn._tobjs[key] = setTimeout(function () {
        qn.emit(key, null, { status: CNST.RSP.timeout });
        delete qn._tobjs[key];
    }, delay);
};

function req(qn, intf, data, callback) {
    var evt,
        err;

    if (!qn.mc || !qn._connected) {
        process.nextTick(function () {
            if (_.isFunction(callback))
                callback(new Error('No connection.'));
            else
                qn._emitError(err);
        });
    } else {
        data.transId = qn._nextTransId(intf);
        evt = intf + ':rsp:' + data.transId;
        reqTimeout(qn, evt, CNST.REQ_TIMEOUT);

        qn.once(evt, function (err, rsp) {
            // if not timeout yet, clear it
            if (!_.isUndefined(qn._tobjs[evt])) {
                clearTimeout(qn._tobjs[evt]);
                delete qn._tobjs[evt];
            }

            rsp.transId = (rsp.status === 408) ? data.transId : rsp.transId;
            debug('RSP <-- %s, transId: %d, status: %s', intf, rsp.transId, rsp.status);

            if (_.isFunction(callback))
                callback(err, rsp);
        });

        return qn.publish(qn._pubics[intf], data, function (err, rsp) {
            debug('REQ --> %s, transId: %d', intf, data.transId);
            // if mqtt publish fails
            if (err)
                qn.emit(evt, err, null);
        });
    }
};

module.exports = request;
