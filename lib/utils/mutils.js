'use strict';

const util = require('util'),
      Enum = require('enum'),
      _ = require('lodash'),
      lwm2mid = require('lwm2m-id');

const mutils = {},
      CMD = new Enum({
        'read': 0,
        'write': 1,
        'discover': 2,
        'writeAttrs': 3,
        'execute': 4,
        'observe': 5,
        'notify': 6,
        'unknown': 255
      });

mutils.jsonify = function (str) {
    var obj;

    try {
        obj = JSON.parse(str);
    } catch (e) {
        return;
    }

    return obj;
};  // undefined/result

mutils.getCmd = function (cmdId) {
    if (!_.isString(cmdId) && !_.isNumber(cmdId))
        throw new TypeError('cmdId should be a type of string or number.');

    return CMD.get(cmdId);
};

mutils.getOid = function (oid) {
    return lwm2mid.getOid(oid);
};

mutils.getRid = function (oid, rid) {
    return lwm2mid.getRid(oid, rid);
};

mutils.oidKey = function (oid) {
    var oidItem = lwm2mid.getOid(oid);

    return oidItem ? oidItem.key : oid;     // if undefined, return itself
};

mutils.oidNumber = function (oid) {
    var oidItem = lwm2mid.getOid(oid);

    oidItem = oidItem ? oidItem.value : parseInt(oid);   // if undefined, return parseInt(itself)

    if (_.isNaN(oidItem))
        oidItem = oid;

    return oidItem;
};

mutils.ridKey = function (oid, rid) {
    var ridItem = lwm2mid.getRid(oid, rid);

    if (_.isUndefined(rid))
        rid = oid;

    return ridItem ? ridItem.key : rid;     // if undefined, return itself
};

mutils.ridNumber = function (oid, rid) {
    var ridItem = lwm2mid.getRid(oid, rid);

    if (_.isUndefined(rid))
        rid = oid;

    ridItem = ridItem ? ridItem.value : parseInt(rid);   // if undefined, return parseInt(itself)

    if (_.isNaN(ridItem))
        ridItem = rid;

    return ridItem;
};

mutils.getSpecificResrcChar = function (oid, rid) {
    return lwm2mid.getSpecificResrcChar(oid, rid);
};  // undefined / resrc characteristic

mutils.dotPath = function (path) {
    path = path.replace(/\//g, '.');           // tranform slash notation into dot notation

    if (path[0] === '.')                       // if the first char of topic is '.', take it off
        path = path.slice(1);

    if (path[path.length-1] === '.')           // if the last char of topic is '.', take it off
        path = path.slice(0, path.length-1);

    return path;
};

mutils.slashPath = function (path) {
    path = path.replace(/\./g, '/');           // tranform dot notation into slash notation

    if (path[0] === '/')                       // if the first char of topic is '/', take it off
        path = path.slice(1);

    if (path[path.length-1] === '/')           // if the last char of topic is '/', take it off
        path = path.slice(0, path.length-1);

    return path;
};

mutils.soWithStringKeys = function (so) {
    var dumped = {};

    _.forEach(so, function (insts, oid) {
        var oidKey = mutils.oidKey(oid);
        dumped[oidKey] = {};

        _.forEach(insts, function (resrcs, iid) {
            dumped[oidKey][iid] = {};
            _.forEach(resrcs, function (r, rid) {
                var ridKey = mutils.ridKey(oid, rid);
                dumped[oidKey][iid][ridKey] = r;
            });
        });
    });

    return dumped;
};

module.exports = mutils;