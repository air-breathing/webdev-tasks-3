/**
 * Created by Надежда on 06.03.2016.
 */
'use strict';

var should = require('chai').should();
var mock = require('mock-fs');
var flow = require('../lib/flow');
var fs = require('fs');


function readFile1(namefile) {
    return function (next) {
        fs.readFile(namefile, function (error, data) {
            next(error, data);
        })
    }
}

function readFile2(namefile) {
    return function (data1, next) {
        fs.readFile('path/text_for_test2.txt', function (error, data2) {
            next(error, data1 + ' ' +data2)
        });
    }
}

function readFile(elem, next) {
    //${} - намеренно не использую
    fs.readFile('path/text_for_test' + elem + '.txt', function (error, data) {
        next(error, data);
    })
}

function toString(data) {
    return data.toString();
}


describe('Flow library', function () {
    before(function () {
        mock({
            'path': {
                'text_for_test1.txt': '1 строка',
                'text_for_test2.txt': '2 строка',
                'text_for_test3.txt': '3 строка',
                'text_for_test4.txt': '4 строка',
                'text_for_test5.txt': '5 строка',
                'text_for_test6.txt': '6 строка'
            }
        })
    });

    describe('makeAsync function', function () {
        it('should add 1 and 1', function (done) {
            var asyncFunction = flow.makeAsync(function(a) {return a.a + a.b});
            asyncFunction({a: 1, b: 1}, function (error, data) {
                data.should.be.equal(2);
                done();
            })
        })
    });

    describe('serial function', function () {
        it('should from files consistently read data', function (done) {
            flow.serial([readFile1('path/text_for_test1.txt'), readFile2('path/text_for_test2.txt')],
                function (error, data) {
                    data.should.be.equal('1 строка 2 строка');
                    data.should.not.be.equal('1 строка2 строка');
                    done();
                });
        });

        it('should from first send data to second', function (done) {
            flow.serial([flow.makeAsync(function() {return 'first'}, 10),
                         flow.makeAsync(function(data) {return [data, 'second']}, 10)],
                function (error, data) {
                    data[0].should.a.equal('first');
                    done();
                })
        });

        it('should throw exception', function (done) {
            flow.serial([flow.makeAsync(function() {throw new Error('Muha-muha')}, 10),
                    flow.makeAsync(function(data) {return [data, 'second']}, 10)],
                function (error, data) {
                    error.toString().should.to.have.string('Muha-muha');
                    done();
                })
        })
    });

    describe('map function', function () {
        it('should read both files', function (done) {
            flow.map([1, 2], readFile, function (error, data) {
                data = data.map(toString);
                data.should.to.have.members(['1 строка', '2 строка']);
                done();
            })
        })
    });

    describe('parallel function', function () {
        it('should write data in one file in different order', function (done) {
            flow.parallel([readFile1('path/text_for_test1.txt'), readFile1('path/text_for_test2.txt')], function (error, data) {
                data = data.map(toString);
                data.should.to.have.members(['1 строка', '2 строка']);
                done();
            })
        });
    });

    describe('parallel limit function', function () {
        it('should read all files', function (done) {
            flow.parallel([readFile1('path/text_for_test1.txt'), readFile1('path/text_for_test2.txt'),
                readFile1('path/text_for_test3.txt'), readFile1('path/text_for_test4.txt'),
                readFile1('path/text_for_test5.txt'), readFile1('path/text_for_test6.txt')],
                2,
                function (error, data) {
                    data = data.map(toString);
                    data.should.to.have.members(['1 строка', '2 строка', '3 строка',
                                                 '4 строка', '5 строка', '6 строка']);
                    done();
                })
        });

        it('should read all files, limit more then function', function (done) {
            flow.parallel([readFile1('path/text_for_test1.txt'), readFile1('path/text_for_test2.txt'),
                    readFile1('path/text_for_test3.txt'), readFile1('path/text_for_test4.txt'),
                    readFile1('path/text_for_test5.txt'), readFile1('path/text_for_test6.txt')],
                7,
                function (error, data) {
                    data = data.map(toString);
                    data.should.to.have.members(['1 строка', '2 строка', '3 строка',
                        '4 строка', '5 строка', '6 строка']);
                    done();
                })
        })
    });

    after(function () {
       mock.restore();
    })
});