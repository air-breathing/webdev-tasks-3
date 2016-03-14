/**
 * Created by Надежда on 06.03.2016.
 */
'use strict';

var should = require('chai').should();
var mock = require('mock-fs');
var flow = require('../lib/flow');
var sinon = require('sinon');

describe('Flow library', function () {
    var clocks = [];

    describe('makeAsync function', function () {
        it('should give right result', function (done) {
            var asyncFunction = flow.makeAsync(
                function(a) {return a.a + a.b; }
            );
            asyncFunction({a: 1, b: 1}, function (error, data) {
                data.should.be.equal(2);
                done();
            })
        });

        it('should be asynchronous', function (done) {
            var x = 1;
            var asyncFunction = flow.makeAsync(function() {
                x.should.be.equal(0);
                done();
            });
            asyncFunction();
            x--;
        });

        it('should withstand a timeout', function () {
            var clock = sinon.useFakeTimers();
            clocks.push(clock);
            var waited_data = undefined;
            var asyncFunction = flow.makeAsync(function(a) {return a + 'async'}, 10);
            asyncFunction('data', function (error, data) {
                waited_data = data;
                clock.restore();
            });
            clock.tick(5);
            should.not.exist(waited_data);
            clock.tick(5);
            should.exist(waited_data);
            //done();
        });

        it('should correct work even data are missing', function (done) {
            var asyncFunction = flow.makeAsync(function() {return 'asynchronous'});
            asyncFunction(function (error, data) {
                data.should.be.a.equal('asynchronous');
                done();
            })
        });

        it('should invoke callback once', function (done) {
            var spy = sinon.spy(function() {return 'asynchronous'});
            var asyncFunction = flow.makeAsync(spy);
            asyncFunction(function () {
                sinon.assert.calledOnce(spy);
                done();
            })
        });

        it('should correct handle errors', function (done) {
            var asyncFunction = flow.makeAsync(function() {
                throw 'My error';
            });
            asyncFunction(function (error) {
                error.should.be.equal('My error');
                done();
            })
        });
    });

    describe('serial function', function () {
        it('should from first send data to second', function (done) {
            flow.serial([flow.makeAsync(function() {return 'first'}, 10),
                         flow.makeAsync(function(data) {return [data, 'second']}, 10)],
                function (error, data) {
                    data[0].should.a.equal('first');
                    data[1].should.a.equal('second');
                    done();
                })
        });

        it('should throw first exception', function (done) {
            flow.serial([flow.makeAsync(function() {throw 'Muha-muha1'}, 10),
                         flow.makeAsync(function() {throw 'Muha-muha2'}, 10)],
                function (error) {
                    error.should.be.equal('Muha-muha1');
                    done();
                })
        });

        it('exception will be in final callback and next function was not called', function (done) {
            var spy = sinon.spy(flow.makeAsync(function() {return 'data'}));
            flow.serial([flow.makeAsync(function() {throw 'Muha-muha1'}, 10), spy],
                function (error) {
                    error.should.be.equal('Muha-muha1');
                    spy.callCount.should.be.equal(0);
                    done();
                })
        });

        it('should be performed consistently', function (done) {
            flow.serial([flow.makeAsync(function() {return 'data1'}, 10),
                         flow.makeAsync(function() {return 'data2'}, 5)],
                function (error, data) {
                    data.should.be.equal('data2');
                    done();
                })
        });

        it('all functions should be called once', function (done) {
            var spy = sinon.spy();
            var spy2 = sinon.spy();
            flow.serial([flow.makeAsync(spy, 10),
                         flow.makeAsync(spy2, 5)],
                function (error, data) {
                    sinon.assert.calledOnce(spy);
                    done();
                })

        })
    });

    describe('map function', function () {
        it('should apply function to all data', function (done) {
            flow.map(['a', 'b', 'c'],
                flow.makeAsync(function(data) {return data + 'q';}),
                function(error, result) {
                    result.should.to.deep.equal(['aq', 'bq', 'cq']);
                    done();
            })
        });

        it('should throw any exception', function () {
            flow.map(['a', 'b', 'c'],
                flow.makeAsync(function(data) {throw 'exception ' + data;}),
                function(error) {
                    error.should.to.be.oneOf('exception a', 'exception b', 'exception c');
                    done();
                })
        });

        it('should invoke function once on one value in array', function () {
            var spy = sinon.spy();
            spy.withArgs('a');
            spy.withArgs('b');
            spy.withArgs('c');
            flow.map(['a', 'b', 'c'],
                spy,
                function() {
                    sinon.assert.calledOnce(spy.withArgs('b'));
                    sinon.assert.calledOnce(spy.withArgs('a'));
                    sinon.assert.calledOnce(spy.withArgs('c'));
                    done();
                })
        });

        it('should catch exception in one of all cases', function (done) {
            flow.map([1, 2, 3],
                flow.makeAsync(function (num) {
                    if (num == 2) {
                        throw 'Error';
                    } else {
                        return num;
                    }
                }),
                function (error) {
                    error.should.be.equal('Error');
                    done();
                }
            )
        })
    });

    describe('parallel function', function () {
        it('should write data in one order', function (done) {
            flow.parallel(
                [flow.makeAsync(function() {return 'data1'}, 3),
                 flow.makeAsync(function() {return 'data2'}, 10)],
                function (error, data) {
                    data.should.to.deep.equal(['data1', 'data2']);
                    done();
                }
            );
        });

        it('should save order', function (done) {
            flow.parallel(
                [flow.makeAsync(function() {return 'data1'}, 10),
                    flow.makeAsync(function() {return 'data2'}, 3)],
                function (error, data) {
                    data.should.to.deep.equal(['data1', 'data2']);
                    done();
                }
            );
        });

        it('should handle exceptions without delay', function (done) {
            flow.parallel(
                [flow.makeAsync(function() {throw 'error1'}, 10),
                 flow.makeAsync(function() {throw 'error2'}, 3)],
                function (error) {
                    error.should.be.equal('error2');
                    done();
                }
            );
        });
    });

    describe('parallel limit function', function () {
        it('should return data in order of functions', function (done) {
            flow.parallel(
                [flow.makeAsync(function () {return 'data1'}, 10),
                 flow.makeAsync(function () {return 'data2'}, 5),
                 flow.makeAsync(function () {return 'data3'})],
                2,
                function (error, data) {
                    data.should.to.deep.equal(['data1', 'data2', 'data3']);
                    done();
                }
            )
        });

        it('should once invoke all functions', function (done) {
            var spy = sinon.spy(function (data) { return data; });
            var spy2 = sinon.spy(function (data) { return data; });
            var spy3 = sinon.spy(function (data) { return data; });
            var asyncSpy = flow.makeAsync(spy, 2);
            var asyncSpy2 = flow.makeAsync(spy2, 3);
            var asyncSpy3 = flow.makeAsync(spy3, 1);
            flow.parallel([asyncSpy, asyncSpy2, asyncSpy3],2,function () {
                sinon.assert.calledOnce(spy);
                sinon.assert.calledOnce(spy2);
                sinon.assert.calledOnce(spy3);
                done();
            })

        });

        it('should return data from all functions', function (done) {
            flow.parallel(
                [flow.makeAsync(function () {return '1case'}, 2),
                 flow.makeAsync(function () {return '2case'}),
                 flow.makeAsync(function () {return '3case'}, 5)],
                2,
                function (error, data){
                    data.should.to.have.members(['1case', '2case', '3case']);
                    done();
                })
        });

        it('should invoke only limit function in one moment', function (done) {
            var spy = sinon.spy(function () {return 'data1'});
            var asyncSpy = flow.makeAsync(spy, 3);
            var asyncSpy1 = flow.makeAsync(spy, 3);
            var asyncSpy2 = flow.makeAsync(spy, 2);
            var asyncSpy3 = flow.makeAsync(spy, 2);
            var clock = sinon.useFakeTimers();
            clocks.push(clock);
            flow.parallel(
                [asyncSpy, asyncSpy1, asyncSpy2, asyncSpy3],
                1,
                function (error, data) {}
            );
            clock.tick(3);
            spy.callCount.should.be.equal(1);
            clock.tick(3);
            spy.callCount.should.be.equal(2);
            clock.tick(2);
            spy.callCount.should.be.equal(3);
            clock.restore();
            done();
        });


        it('should invoke only limit function in the moment 2', function (done) {
            var spy = sinon.spy(function () {return 'data1'; });
            var asyncSpy = flow.makeAsync(spy, 3);
            var asyncSpy1 = flow.makeAsync(spy);
            var asyncSpy2 = flow.makeAsync(spy, 5);
            var asyncSpy3 = flow.makeAsync(spy, 10);
            var clock = sinon.useFakeTimers();
            clocks.push(clock);
            flow.parallel(
                [asyncSpy, asyncSpy1, asyncSpy2, asyncSpy3],
                2,
                function (error, data) {}
            );
            clock.tick(1);
            spy.callCount.should.be.equal(1);
            clock.tick(3);
            spy.callCount.should.be.equal(2);
            clock.tick(4);
            spy.callCount.should.be.equal(3);
            clock.tick(10);
            spy.callCount.should.be.equal(4);
            clock.restore();
            done();
        });

        it('should catch exception from any function', function (done) {
            flow.parallel(
                [flow.makeAsync(function () { return 'data1';}),
                 flow.makeAsync(function () { throw 'error2';}),
                 flow.makeAsync(function () { return 'data3';})],
                2,
                function (error) {
                    error.should.be.equal('error2');
                    done();
                }
            )
        });

        it('should catch any first exception', function (done) {
            flow.parallel(
                [flow.makeAsync(function () { throw 'error1';}, 0),
                 flow.makeAsync(function () { throw 'error2';}, 1),
                 flow.makeAsync(function () { throw 'error3';}, 2)],
                3,
                function (error) {
                    error.should.be.equal('error1');
                    done();
                }
            )
        });

        it('should catch any first exception 2', function (done) {
            flow.parallel(
                [flow.makeAsync(function () { throw 'error1';}, 3),
                 flow.makeAsync(function () { throw 'error2';}, 1),
                 flow.makeAsync(function () { throw 'error3';}, 2)],
                3,
                function (error) {
                    error.should.be.equal('error2');
                    done();
                }
            )
        });

        it('should invoke callback once', function (done) {
            var spy = sinon.spy(function (error) {
                spy.callCount.should.be.equal(1);
                done();
            });
            flow.parallel(
                [flow.makeAsync(function () { return 'data1';}),
                 flow.makeAsync(function () { return 'data2';}),
                 flow.makeAsync(function () { return 'data3';})],
                3,
                spy
            );
        });
    });

    after(function (done) {
        clocks.forEach(function(elem) {
            elem.restore();
        });
        done();
    });
});
