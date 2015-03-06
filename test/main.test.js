'use strict';

var should = require('should');
var assert = require('assert');
var path = require('path');
var port = 4444;

var HttpHelper = require('./helpers/HttpHelper');
var httpHelper = new HttpHelper("localhost", port, {
  'accept': "application/json",
  'content-type': "application/json",
  'origin': 'unit-tests'
});

describe('testing nodetastic', function() {
  this.timeout(0);

  it('testing start server', function(done) {
    var nodetastic = require("../");
    var mapper = nodetastic.CreateNodeTastic();
    mapper.injectReservedValue("$zero", function() {
      return 0;
    });
    mapper.injectReservedValue("$zerocb", function(context, param, cb) {
      cb(null, 0);
    });
    mapper.injectReservedValue("$two", function() {
      return 2;
    });
    mapper.injectReservedValue("$twocb", function(context, param, cb) {
      cb(null, 2);
    });
    mapper.injectReservedValue("$null", function(context, param, cb) {
      cb(null, mapper.emptyValue);
    });
    mapper.injectReservedValue("$wrongnull", function(context, param, cb) {
      cb(null, null);
    });
    mapper.setTranslateResultFunction(function(res) {
      var response = {
        success: res.success,
        data: res.data,
        errors: []
      };
      if(!res.success) {
        var errors = res.error;
        if(!res.IsResultArray) {
          errors = [res];
        }
        for(var i = 0; i < errors.length; i++) {
          var e = errors[i];
          response.errors.push({
            errorCode: e.errorCode,
            error: e.error,
            errorDetails: e.errorDetails
          });
        }
      }
      if(res.extra) {
        for(var element in res.extra) {
          if(res.extra.hasOwnProperty(element)) {
            response[element] = res.extra[element];
          }
        }
      }
      return response;
    });
    mapper.registerHandler("", {
      hello: function(cb) {
        cb(null, "hello world");
      },
      path: {
        hello: function(cb) {
          cb(null, "hello world from path");
        }
      },
      helloname: function(strName, cb) {
        cb(null, "hello world: " + strName);
      },
      helloint: function(nInt, cb) {
        cb(null, "hello world: " + nInt);
      },
      missing: function($na, cb) {
        cb();
      },
      zero: function($zero, $twocb, $null, cb) {
        cb(null, $zero + " " + $twocb + " " + $null);
      },
      zerocb: function($zerocb, $two, $null, cb) {
        cb(null, $zerocb + " " + $two + " " + $null);
      },
      wrongnull: function($wrongnull, cb) {
        cb();
      }
    });
    mapper.registerHandler("module1", {
      hello: function(cb) {
        cb(null, "hello world module1");
      },
      path: {
        hello: function(cb) {
          cb(null, "hello world module1 from path");
        }
      }
    });
    mapper.registerHandler("module1/module2", {
      hello: function(cb) {
        cb(null, "hello world module2");
      },
      path: {
        hello: function(cb) {
          cb(null, "hello world module2 from path");
        }
      }
    });
    mapper.startServer(port, function() {
      done();
    });
  });

  it('testing ping', function(done) {
    httpHelper.createGet("/ping").getJson(function(err, result) {
      assert(result.date);
      done();
    });
  });

  it('testing hello', function(done) {
    httpHelper.createGet("/hello").getJson(function(err, result) {
      assert(result.data == "hello world");
      done();
    });
  });

  it('testing hello from path', function(done) {
    httpHelper.createGet("/path/hello").getJson(function(err, result) {
      assert(result.data == "hello world from path");
      done();
    });
  });

  it('testing hello module1', function(done) {
    httpHelper.createGet("/module1/hello").getJson(function(err, result) {
      assert(result.data == "hello world module1");
      done();
    });
  });

  it('testing hello module1 from path', function(done) {
    httpHelper.createGet("/module1/path/hello").getJson(function(err, result) {
      assert(result.data == "hello world module1 from path");
      done();
    });
  });

  it('testing hello module2', function(done) {
    httpHelper.createGet("/module1/module2/hello").getJson(function(err, result) {
      assert(result.data == "hello world module2");
      done();
    });
  });

  it('testing hello module2 from path', function(done) {
    httpHelper.createGet("/module1/module2/path/hello").getJson(function(err, result) {
      assert(result.data == "hello world module2 from path");
      done();
    });
  });

  it('testing invalid function', function(done) {
    httpHelper.createGet("/non-exist").getJson(function(err, result) {
      assert(!result.success);
      assert(result.errors[0].errorDetails == 'could not find function');
      done();
    });
  });

  it('testing helloname mocha', function(done) {
    httpHelper.createGet("/helloname").getJson({strName:"mocha"}, function(err, result) {
      assert(result.data == "hello world: mocha");
      done();
    });
  });

  it('testing helloname without param', function(done) {
    httpHelper.createGet("/helloname").getJson(function(err, result) {
      assert(!result.success);
      assert(result.errors[0].errorDetails == 'param [strName] not supplied');
      done();
    });
  });

  it('testing helloint 1', function(done) {
    httpHelper.createGet("/helloint").getJson({nInt:1}, function(err, result) {
      assert(result.data == "hello world: 1");
      done();
    });
  });

  it('testing helloint with invalid type', function(done) {
    httpHelper.createGet("/helloint").getJson({nInt:"string"}, function(err, result) {
      assert(!result.success);
      assert(result.errors[0].errorDetails == 'param validation failed name[nInt] value[string]');
      done();
    });
  });

  it('testing helloint with invalid type', function(done) {
    httpHelper.createGet("/helloint").getJson({nInt:{}}, function(err, result) {
      assert(!result.success);
      assert(result.errors[0].errorDetails == 'param validation failed name[nInt] value[{}]');
      done();
    });
  });

  it('testing missing', function(done) {
    httpHelper.createGet("/missing").getJson(function(err, result) {
      assert(!result.success);
      assert(result.errors[0].errorDetails == 'param [$na] not supplied');
      done();
    });
  });

  it('testing zero', function(done) {
    httpHelper.createGet("/zero").getJson(function(err, result) {
      assert(result.success);
      assert(result.data == "0 2 null");
      done();
    });
  });

  it('testing zerocb', function(done) {
    httpHelper.createGet("/zerocb").getJson(function(err, result) {
      assert(result.success);
      assert(result.data == "0 2 null");
      done();
    });
  });

  it('testing zerocb', function(done) {
    httpHelper.createGet("/wrongnull").getJson(function(err, result) {
      assert(!result.success);
      assert(result.errors[0].errorDetails == 'param [$wrongnull] not supplied');
      done();
    });
  });

});

