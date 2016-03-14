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
    var amountResults = 0;
    var errors = [];
    funcArray.forEach(
        (elem, ind) => {
            elem(
                (error, data) => {
                    if (error) {
                        errors.push(error);
                    } else {
                        results[ind] = data;
                        amountResults ++;
                    }
                    if (amountResults + errors.length == funcArray.length) {
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
    var amountResults = 0;
    var errors = [];
    var amountFunction = funcArray.length;
    if (funcArray.length === 0) {
        return;
    }
    var startFuncs = funcArray.splice(0, limit);
    var indexFirstFunction = limit;
        startFuncs.forEach(
        (elem, ind) => {
            function callbackForLimit(ind, error, data) {
                    if (error) {
                        errors.push(error);
                    } else {
                        //results.push(data);
                        results[ind] = data;
                        amountResults ++;
                    }
                    var func = funcArray.shift();
                    if (func != undefined) {
                        func(callbackForLimit.bind(null, indexFirstFunction));
                        //console.log(indexFirstFunction + 'qwqwqw');
                        indexFirstFunction ++;
                    }
                    if (amountFunction == amountResults + errors.length) {
                        results = errors[0] != undefined ? undefined:results;
                        callback(errors[0], results);
                    }
            };
            elem(callbackForLimit.bind(null, ind));
        }
    );
}


module.exports.map = function (array, func, callback) {
    var results = [];
    var amountResults = 0;
    var errors = [];
    array.forEach(
        (elem, ind) => {
            func(elem,
                (error, data) => {
                    if (error) {
                        errors.push(error);
                    } else {
                        results[ind] = data;
                        amountResults ++;
                    }
                    if (amountResults + errors.length== array.length) {
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