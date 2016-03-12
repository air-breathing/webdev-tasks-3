/**
 * Created by Надежда on 06.03.2016.
 */
'use strict';

var should = require('chai').should();
var mock = require('mock-fs');
var flow = require('../lib/flow');
var sinon = require('sinon');

describe('Flow library', function () {
    describe('makeAsync function', function () {
        it('should give right result', function (done) {
            var asyncFunction = flow.makeAsync(function(a) {return a.a + a.b});
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

        it('should withstand a timeout', function (done) {
            var clock = sinon.useFakeTimers();
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
            done();
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
                spy.calledOnce.should.be.true;
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


        it('exception will be in final callback', function (done) {
            flow.serial([flow.makeAsync(function() {throw 'Muha-muha1'}, 10),
                    flow.makeAsync(function() {return 'data'}, 10)],
                function (error) {
                    error.should.be.equal('Muha-muha1');
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
                    spy.calledOnce.should.be.true;
                    //console.log(spy2.calledOnce);
                    done();
                })

        })
    });

    describe('map function', function () {
        it('should apply function to all data', function (done) {
            flow.map(['a', 'b', 'c'],
                flow.makeAsync(function(data) {return data + 'q';}),
                function(error, result) {
                    result.should.to.have.members(['aq', 'cq', 'bq']);
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
                    spy.withArgs('a').calledOnce.should.be.true;
                    spy.withArgs('b').calledOnce.should.be.true;
                    spy.withArgs('c').calledOnce.should.be.true;
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

        it('should write data in different order', function (done) {
            flow.parallel(
                [flow.makeAsync(function() {return 'data1'}, 10),
                flow.makeAsync(function() {return 'data2'}, 3)],
                function (error, data) {
                    data.should.to.deep.equal(['data2', 'data1']);
                    done();
                }
            );
        });


        it('should handle exceptions', function (done) {
            flow.parallel(
                [flow.makeAsync(function() {throw 'error1'}),
                 flow.makeAsync(function() {throw 'error2'})],
                function (error) {
                    error.should.to.be.oneOf(['error1', 'error2']);
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

        it('should return data from all functions', function (done) {
            flow.parallel(
                [flow.makeAsync(function () {return '1case'}, 2),
                    flow.makeAsync(function () {return '2case'}),
                    flow.makeAsync(function () {return '3case'}, 5)],
                function (error, data){
                    done();
                })
        })

    });

    describe('parallel limit function', function () {
        it('should be parallel', function (done) {
            flow.parallel(
                [flow.makeAsync(function () {return 'data1'}, 10),
                 flow.makeAsync(function () {return 'data2'}, 5),
                 flow.makeAsync(function () {return 'data3'})],
                2,
                function (error, data) {
                    data.should.to.deep.equal(['data2', 'data3', 'data1']);
                    done();
                }
            )
        });

        it('should once invoke all functions', function (done) {
            var spy = sinon.spy(function (data) { return data; });
            spy.withArgs('1case');
            var spy2 = sinon.spy(function (data) { return data; });
            spy2.withArgs('2case');
            var spy3 = sinon.spy(function (data) { return data; });
            spy3.withArgs('3case');
            var asyncSpy = flow.makeAsync(spy, 2);
            var asyncSpy2 = flow.makeAsync(spy2, 3);
            var asyncSpy3 = flow.makeAsync(spy3, 1);
            flow.parallel([asyncSpy, asyncSpy2, asyncSpy3],2,function () {
                spy.calledOnce.should.be.true;
                spy2.calledOnce.should.be.true;
                spy3.calledOnce.should.be.true;
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
            flow.parallel(
                [asyncSpy, asyncSpy1, asyncSpy2, asyncSpy3],
                1,
                function (error, data) {
                    //console.log(data);
                    //
                    //done();
                }
            );
            clock.tick(3);
            spy.calledOnce.should.be.true;
            clock.tick(3);
            spy.calledTwice.should.be.true;
            clock.tick(2);
            spy.calledThrice.should.be.true;
            clock.restore();
            done();
        });


        it('should invoke only limit function in the moment 2', function (done) {
            var spy = sinon.spy(function () {return 'data1'});
            var asyncSpy = flow.makeAsync(spy, 3);
            var asyncSpy1 = flow.makeAsync(spy, 3);
            var asyncSpy2 = flow.makeAsync(spy, 3);
            var asyncSpy3 = flow.makeAsync(spy, 3);
            var clock = sinon.useFakeTimers();
            flow.parallel(
                [asyncSpy, asyncSpy1, asyncSpy2, asyncSpy3],
                2,
                function (error, data) {
                    //console.log(data);
                    //
                    //done();
                }
            );
            clock.tick(3);
            spy.calledTwice.should.be.true;
            clock.tick(3);
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
                [flow.makeAsync(function () { throw 'error1';}),
                    flow.makeAsync(function () { throw 'error2';}),
                    flow.makeAsync(function () { throw 'error3';})],
                3,
                function (error) {
                    error.should.to.be.oneOf(['error1', 'error2', 'error3']);
                    done();
                }
            )
        })

        it('should invoke callback once', function (done) {
            var spy = sinon.spy(function (error)
            {
                spy.calledOnce.should.to.be.true;
                done();
            });
            flow.parallel(
                [flow.makeAsync(function () { return 'data1';}),
                flow.makeAsync(function () { return 'data2';}),
                flow.makeAsync(function () { return 'data3';})],
                3,
                spy
            )
        })
    });
});