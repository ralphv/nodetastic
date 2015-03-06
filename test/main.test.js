'use strict';

var should = require('should');
var assert = require('assert');
var path = require('path');
var port = 4444;
var cb_result = require("cb-result");
var mapper;

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
    mapper = nodetastic.CreateNodeTastic({verbose: 2});
    mapper.registerNewSessionFunction(function($inject, cb) {
      $inject.get("$session", cb_result.cb(cb, function($session) {
        $session.set("newsession", "newsession");
        cb();
      }));
    });
    mapper.attachGlobalService(mapper.Services.StateService, {
      states: ["loggedIn", "loggedOut"],
      valid: {"loggedIn": ["loggedOut"], "loggedOut": ["loggedIn"]},
      start: "loggedOut",
      defaultMeta: "loggedOut" // no meta data on functions = must be logged in
    });
    mapper.attachGlobalService(mapper.Services.ExpiresService);
    var err = null;
    try {
      mapper.injectReservedValue("zero", function() {
        return 0;
      });
    }
    catch(e) {
      err = e;
    }
    assert(err);
    mapper.injectReservedValue("$zero", function() {
      return 0;
    });
    mapper.injectReservedValue("$zerocb", function(context, param, cb) {
      cb(null, 0);
    });
    mapper.injectReservedValue("$two", function() {
      return 2;
    });
    mapper.injectReservedValue("$twocb", function(context, param, $two, cb) {
      cb(null, $two);
    });
    mapper.injectReservedValue("$null", function(context, param, cb) {
      cb(null, mapper.emptyValue);
    });
    mapper.injectReservedValue("$wrongnull", function(context, param, cb) {
      cb(null, null);
    });
    mapper.injectReservedValue("$cd_root", function(context, param, $cd_child1, cb) {
      cb();
    });
    mapper.injectReservedValue("$cd_child1", function(context, param, $cd_child2, cb) {
      cb();
    });
    mapper.injectReservedValue("$cd_child2", function(context, param, $cd_root, cb) {
      cb();
    });
    mapper.setTranslateResultFunction();
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
      helloobj: function(objData, cb) {
        cb(null, "hello world: " + objData.data);
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
      },
      cderror: function($cd_root, cb) {
        cb();
      },
      error: function(cb) {
        cb(cb_result.error("error message"));
      },
      errorraw: function(cb) {
        cb("error message");
      },
      simplecash: function($HttpCacheIndicator, cb) {
        cb($HttpCacheIndicator(cb_result.success({data: "data"}), ["key", "key1"]));
      },
      simplecash1: function($HttpCacheIndicator, cb) {
        cb($HttpCacheIndicator(cb_result.success({data: "data"}), ["key", "key1"], -1));
      },
      passivecash: function(cb) {
        //<meta>{"ExpiresMinutes":60}</meta>
        cb(cb_result.success({data: "data"}));
      },
      servercashset: function($cache$15, objData, cb) {
        $cache$15.set("objData", objData);
        $cache$15.set(["objData", "one"], objData);
        cb();
      },
      servercashget: function($cache$15, cb) {
        $cache$15.has("objData");
        $cache$15.get(["objData", "one"]);
        cb(cb_result.success($cache$15.get("objData")));
      },
      login: function($session, $state, cb) {
        //<meta>{"StateService":"loggedOut"}</meta>
        $session.set("loggedIn", true);
        $state.set("loggedIn");
        cb();
      },
      islogin: function($session, cb) {
        //<meta>{"StateService":"any"}</meta>
        cb(cb_result.success($session.get("loggedIn")));
      },
      logout: function($session, $state, cb) {
        //<meta>{"StateService":"loggedIn"}</meta>
        $state.set("loggedOut");
        $session.set("loggedIn", false);
        $session.del("loggedIn");
        var id = $session.getId();
        var core = $session.getCoreSession();
        assert($session.isValid());
        $session.destroy();
        assert(!$session.isValid());
        cb(null, id);
      },
      etagcash: function($HttpCacheIndicator, $eTagChecksum, cb) {
        var cacheKey = ["key", "key1"];
        if($eTagChecksum && global.isChecksumEqual($eTagChecksum, cacheKey)) {
          return cb($HttpCacheIndicator(cb_result.success(), cacheKey, -1));
        }
        cb($HttpCacheIndicator(cb_result.success({data: "data"}), cacheKey, -1));
      },
      manyreservedwords: function($request, $response, $session, $method, $path, $body, $query, $cache, $urlParams, $data, $inject, cb) {
        $inject.get("$twocb", function(res) {
          assert(res.data == 2);
          $inject.get("$two", function(res) {
            assert(res.data == 2);
            $inject.get("$null", function(res) {
              assert(res.data == null);
              cb();
            })
          })
        })
      }
    });
    mapper.setGlobalPrefix("/rest");
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
    err = null;
    try {
      mapper.registerHandler("module1", {});
    }
    catch(e) {
      err = e;
    }
    assert(err);
    mapper.registerHandler("module1/module2/", {
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
      console.log(result);
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
    httpHelper.createGet("/rest/module1/hello").getJson(function(err, result) {
      assert(result.data == "hello world module1");
      done();
    });
  });

  it('testing hello module1 from path', function(done) {
    httpHelper.createGet("/rest/module1/path/hello").getJson(function(err, result) {
      assert(result.data == "hello world module1 from path");
      done();
    });
  });

  it('testing hello module2', function(done) {
    httpHelper.createGet("/rest/module1/module2/hello").getJson(function(err, result) {
      assert(result.data == "hello world module2");
      done();
    });
  });

  it('testing hello module2 from path', function(done) {
    httpHelper.createGet("/rest/module1/module2/path/hello").getJson(function(err, result) {
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
    httpHelper.createGet("/helloname").getJson({strName: "mocha"}, function(err, result) {
      assert(result.data == "hello world: mocha");
      done();
    });
  });

  it('testing helloname mocha post', function(done) {
    httpHelper.createPost("/helloname").postJson({strName: "mocha"}, function(err, result) {
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
    httpHelper.createGet("/helloint").getJson({nInt: 1}, function(err, result) {
      assert(result.state);
      assert(result.data == "hello world: 1");
      done();
    });
  });

  it('testing helloobj', function(done) {
    httpHelper.createGet("/helloobj").getJson({objData: {data: "obj"}}, function(err, result) {
      assert(result.data == "hello world: obj");
      done();
    });
  });

  it('testing helloint with invalid type', function(done) {
    httpHelper.createGet("/helloint").getJson({nInt: "string"}, function(err, result) {
      assert(!result.success);
      assert(result.errors[0].errorDetails == 'param validation failed name[nInt] value[string]');
      done();
    });
  });

  it('testing helloint with invalid type', function(done) {
    httpHelper.createGet("/helloint").getJson({nInt: {}}, function(err, result) {
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

  it('testing cderror', function(done) {
    httpHelper.createGet("/cderror").getJson(function(err, result) {
      assert(!result.success);
      assert(result.errors[0].error == 'Circular dependency detected in reserved words for DynamicHttpLayer: $cd_root > $cd_child1 > $cd_child2 > $cd_root');
      done();
    });
  });

  it('testing error', function(done) {
    httpHelper.createGet("/error").getJson(function(err, result, res) {
      assert(!result.success);
      assert(result.errors[0].error == "error message");
      assert(result.state);
      httpHelper.createGet("/errorraw").getJson(function(err, result, res) {


        console.log(result);

        assert(!result.success);
        assert(result.errors[0].error == "error message");
        assert(result.state);
        done();
      });
    });
  });

  it('testing simplecash', function(done) {
    httpHelper.createGet("/simplecash").getJson(function(err, result, res) {
      assert(result.success);
      assert(res.headers.etag);
      var etag = res.headers.etag;
      httpHelper.createGet("/simplecash").addHeader("if-none-match", etag).get(function(err, result, res) {
        assert(res.statusCode == 304); // cached response
        done();
      });
    });
  });

  it('testing simplecash1', function(done) {
    httpHelper.createGet("/simplecash1").getJson(function(err, result, res) {
      assert(result.success);
      assert(res.headers.etag);
      var etag = res.headers.etag;
      httpHelper.createGet("/simplecash1").addHeader("if-none-match", etag).get(function(err, result, res) {
        assert(res.statusCode == 304); // cached response
        done();
      });
    });
  });

  it('testing passivecash', function(done) {
    httpHelper.createGet("/passivecash").getJson(function(err, result, res) {
      assert(result.success);
      assert(res.headers["cache-control"] == "public, max-age=3600");
      done();
    });
  });

  it('testing etagcash', function(done) {
    httpHelper.createGet("/etagcash").getJson(function(err, result, res) {
      assert(result.success);
      assert(res.headers.etag);
      var etag = res.headers.etag;
      httpHelper.createGet("/etagcash").addHeader("if-none-match", etag).get(function(err, result, res) {
        assert(res.statusCode == 304); // cached response
        done();
      });
    });
  });

  it('testing manyreservedwords', function(done) {
    httpHelper.createGet("/manyreservedwords").getJson(function(err, result) {
      assert(result.success);
      done()
    });
  });

  it('testing session', function(done) {
    httpHelper.createGet("/logout").getJson(function(err, result) {
      console.log(result);
      assert(!result.success);
      assert(result.errors[0].errorDetails == 'invalid state, must be: loggedIn');
      httpHelper.createGet("/login").getJson(function(err, result, res) {
        assert(result.success);
        var cookie = res.headers["set-cookie"];
        assert(cookie);
        httpHelper.createGet("/islogin").addHeader("cookie", cookie).getJson(function(err, result) {
          assert(result.success);
          assert(result.data == true);
          httpHelper.createGet("/logout").addHeader("cookie", cookie).getJson(function(err, result) {
            httpHelper.createGet("/islogin").addHeader("cookie", cookie).getJson(function(err, result) {
              assert(result.success);
              assert(!result.data);
              done();
            });
          });
        });
      });
    });
  });

  it('testing servercash', function(done) {
    httpHelper.createPost("/servercashset").postJson({objData: {"data": "cached"}}, function(err, result) {
      assert(result.success);
      httpHelper.createPost("/servercashget").postJson({objData: {"data": "cached"}}, function(err, result) {
        assert(result.data && result.data.data == "cached");
        done();
      });
    });
  });

  it('testing setTemporaryHalt', function(done) {
    mapper.setTemporaryHalt({"data": "server is down"});
    httpHelper.createGet("/login").getJson(function(err, result) {
      assert(result.data == "server is down");
      httpHelper.createGet("/anything").getJson(function(err, result) {
        mapper.removeTemporaryHalt();
        assert(result.data == "server is down");
        done();
      });
    });
  });

});

