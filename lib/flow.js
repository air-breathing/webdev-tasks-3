'use strict';

module.exports.serial = function (funcArray, callback) {
    if (funcArray.length === 0) {
        return;
    }
    var lostFunction = funcArray.shift();
    lostFunction(function next(error, data) {
        if (error)  {
            callback(error);
        } else {
            lostFunction = funcArray.shift();
            if (funcArray.length === 0) {
                lostFunction(data, callback);
            } else {
                lostFunction(data, next);
            }
        }
    });
};

module.exports.parallel = function () {
    if (arguments[2] == undefined) {
        return unlimitParallel.apply(null, Array.prototype.slice.call(arguments));
    } else {
        return limitParallel.apply(null, Array.prototype.slice.call(arguments));
    }
};

function unlimitParallel(funcArray, callback) {
    var results = [];
    var errors = [];
    funcArray.forEach(
        (elem, index) => {
            elem(
                (error, data) => {
                    if (error) {
                        //callback(error);
                        errors.push(error);
                    } else {
                        results.push(data);
                    }
                    if (results.length + errors.length == funcArray.length) {
                        results = errors[0] != undefined ? undefined:results;
                        callback(errors[0], results);
                    }
                }
            )
        }
    );
};

function limitParallel(funcArray, limit, callback) {
    var results = [];
    var errors = [];
    var amount_function = funcArray.length;
    if (funcArray.length === 0) {
        return;
    }
    var startFuncs = funcArray.splice(0, limit);
    startFuncs.forEach(
        (elem, index) => {
            elem(function callbackForLimit(error, data) {
                    if (error) {
                        errors.push(error);
                        //callback(error);
                    } else {
                        results.push(data);
                    }
                    var func = funcArray.shift();
                    if (func != undefined) {
                        func(callbackForLimit);
                    }
                    if (amount_function == results.length + errors.length) {
                        results = errors[0] != undefined ? undefined:results;
                        callback(errors[0], results);
                    }
                }
            )
        }
    );

}


module.exports.map = function (array, func, callback) {
    var results = [];
    var errors = [];
    array.forEach(
        (elem, index) => {
            func(elem,
                (error, data) => {
                    if (error) {
                        errors.push(error);
                    } else {
                        results.push(data);
                    }
                    if (results.length + errors.length== array.length) {
                        results = errors[0] != undefined ? undefined:results;
                        callback(errors[0], results);
                    }
                }
            )
        }
    );
};

module.exports.makeAsync = function (syncFunc, timeout) {
    var new_timeout = timeout || 0;
    return function (data, cb) {
        //console.log(data);
        cb = cb || data;
        setTimeout(function () {
            try {
                var result = syncFunc(data);
                cb(undefined, result);
            } catch (err) {
                cb(err)
            }
        }, new_timeout)
    }
};