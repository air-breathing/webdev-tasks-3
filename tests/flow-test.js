/**
 * Created by Надежда on 06.03.2016.
 */
'use strict';

var assert = require('assert');
var should = require('chai').should();
var fs = require('fs');
var flow = require('../lib/flow');

function readFile1(namefile) {
    return function (next) {
        fs.readFile(namefile, function (error, data) {
            next(error, data);
        })
    }
}

function readFile2(namefile) {
    return function (data1, next) {
        fs.readFile('text_for_test2.txt', function (error, data2) {
            next(error, data1 + ' ' +data2)
        });
    }
}

function readFile(elem, next) {
    //${} - намеренно не использую
    fs.readFile('text_for_test' + elem + '.txt', function (error, data) {
        next(error, data);
    })
}

describe('Flow library', function () {
    before(function (done) {
        fs.writeFile('text_for_test1.txt', '1 строка', function (error) {
            done();
        })
    });

    before(function (done) {
        fs.writeFile('text_for_test2.txt', '2 строка', function (error) {
            done();
        })
    });

    describe('serial function', function () {
        it('should from files consistently read data', function (done) {
            flow.serial([readFile1('text_for_test1.txt'), readFile2('text_for_test2.txt')], function (error, data) {
                data.should.be.equal('1 строка 2 строка');
                data.should.not.be.equal('1 строка2 строка');
                done();
            });
        })
    });

    describe('map function', function () {
        it('should read both files', function (done) {
            flow.map([1, 2], readFile, function (error, data) {
                data = [data[0].toString(), data[1].toString()];
                data.should.to.have.members(['1 строка', '2 строка']);
                done();
            })
        })
    });

    describe('parallel function', function () {
        it('should write data in one file in different order', function (done) {
            flow.parallel([readFile1('text_for_test1.txt'), readFile1('text_for_test2.txt')], function (error, data) {
                data = [data[0].toString(), data[1].toString()];
                data.should.to.have.members(['1 строка', '2 строка']);
                done();
            })
        });
    })
});