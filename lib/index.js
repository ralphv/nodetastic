/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

/**
 * This is basically a super layer on top of express that provides mapping urls -> classes/functions in a very dynamic way, achieving polymorphism easily
 * It also uses dependency injection to deliver the parameters needed to the functions and if the parameters use Hungarian notation, they automagically get type checking
 * You can inject your own reserved values as well to extend the dependency injection system (the functions of the reserved values themselves can use dependency injection)
 * You can add services that extends the functionality of this layer (see StateService.js), services are more powerful than reserved words, they
 *    can control the request itself before it gets resolved into a function.
 * you can set a result translation function that will be called at the end before returning the data back to the http
 * you can add support to dynamic virtual functions via the optional use of $getFunction
 * you can control http 304 caching requests/responses by sending a special structure in the payload of the response
 * you can use server side caching service by using $cache$(minutes), the delivered cache is protected against collision within the same class
 */
"use strict";

require("./extend.js");
var _ = require("lodash");
var async = require("async");
var assert = require("assert");
var result = require("cb-result");
var cb_result = result;

var logger = require("../logger.js");
var config = require("../config.js");
var $emptyValue = require("./EmptyValue.js");
var jsonSchemas = require("./PrefixSchemas.js");
var SessionWrapper = require("./SessionWrapper");
var validateParams = require("./ValidateParams.js");
var additionalServices = require("./LoadServices.js");
var CircularDependency = require("./CircularDependency.js");
var defaultReservedValuesHash = require("./ReservedValues.js");
var ClassRegistryDataStructure = require("./ClassRegistry.js");

var colors = null;
try { colors = require("colors"); } catch(err) { logger.warn("module 'colors' is missing, httpVerbose will be off"); }

var allowedUntyped = require('../config.js').allowedUntyped;
var disable304Caching = require('../config.js').disable304Caching;

function NodeTastic() {
  this.IsNodeTastic = true;
  this.classRegistry = new ClassRegistryDataStructure();
  this.prepareReservedValues();
  if(config.httpVerbose) {
    logger.info("[NodeTastic: verbose mode ON]");
  }
}

NodeTastic.prototype = {
  setupSocketIO: function(sessionToSocketIORoomFn, socketIoRecieveDataFn) {
    this.sessionToSocketIORoomFn = sessionToSocketIORoomFn;
    this.socketIoRecieveDataFn = socketIoRecieveDataFn;
  },
  startServer: function(port, cb) {
    require("./server.js")(port, this, cb);
  },
  setTemporaryHalt: function(jsonResponse) {
    this.temporaryHaltJsonResponse = jsonResponse;
  },
  removeTemporaryHalt: function() {
    this.temporaryHaltJsonResponse = null;
  },
  registerNewSessionFunction: function(newSessionFn) {
    this.newSessionFn = newSessionFn;
  },
  globalClassInstance: {},
  Services: additionalServices,
  registerHandler: function(name, classInstance) {
    if(arguments.length == 1) {
      classInstance = name;
      name = "";
    }
    this.classRegistry.add(name, classInstance);
  },
  attachGlobalService: function(service, opts) {
    return this.attachService(this.globalClassInstance, service, opts);
  },
  attachService: function(classInstance, service, opts) {
    if(!service || !service.IsService) {
      throw new Error("Invalid service given to AttachService");
    }
    if(classInstance[service.constructor.AttachedPropertyName]) {
      throw new Error("Service already attached");
    }
    return classInstance[service.constructor.AttachedPropertyName] = new service.constructor(this, opts);
  },
  attachServiceInstance: function(classInstance, instance) {
    if(!instance || !instance.IsService) {
      throw new Error("Invalid service given to AttachServiceInstance");
    }
    classInstance[instance.constructor.AttachedPropertyName] = instance;
  },
  setGlobalPrefix: function(prefix) {
    if(prefix[0] === "/") {
      prefix = prefix.substring(1);
    }
    if(prefix[prefix.length - 1] === "/") {
      prefix = prefix.substring(0, prefix.length - 1);
    }
    this.classRegistry.prefix = prefix;
  },
  prepareReservedValues: function() {
    this.reservedValuesHash = {};
    for(var i in defaultReservedValuesHash) {
      this.reservedValuesHash[i] = defaultReservedValuesHash[i];
    }
  },
  injectReservedValue: function(paramName, fn) {
    if(paramName.indexOf("$") !== 0) {
      throw new Error("injectReservedValue parameter name should start with $");
    }
    if(this.reservedValuesHash[paramName]) {
      logger.warn("injectReservedValue called with already registered paramName: " + paramName);
    }
    this.reservedValuesHash[paramName] = fn;
  },
  injectParamPrefix: function(prefixName, prefixData) {
    jsonSchemas[prefixName] = prefixData;
  },
  getRouteRequestFunction: function() {
    var self = this;
    return function(req, res) { return self.routeRequest(req, res); }
  },
  routeRequest: function(req, res) {
    var self = this;
    var context = {
      req: req,
      res: res,
      resultObject: undefined,
      skipInvokeFunction: function(res) {
        this._skipInvokeFunction = true;
        context.invoke_cb_result = cb_result.isType(res) ? res : cb_result.success(res);
      }
    };

    function createStep(fn, skipCondition) {
      return function(cb) {
        if(skipCondition && skipCondition()) {
          return cb();
        }
        try {
          fn.call(self, context, result.cb(cb, function(brk) {
            if(brk === true) { //success(true) is indication to stop the loop gracefully
              return cb(result.success(brk));
            }
            cb();
          }));
        }
        catch(e) {
          //console.log(e.stack);
          e = result.error(e);
          e.httpCode = 500;
          cb(e);
        }
      }
    }

    async.series([
      createStep(self.stepHeaderOrigin),
      createStep(self.stepStartTimer),
      createStep(self.stepBeforeRequest),
      createStep(self.stepProcessPing),
      createStep(self.stepCachePreProcess),
      createStep(self.stepDefaultDisableCache),
      createStep(self.stepFindInstance),
      createStep(self.stepCheckNewSession),
      createStep(self.stepFillUrlParts),
      createStep(self.stepExtractUrlVariables),
      createStep(self.stepGetFunctionName),
      createStep(self.stepGetFunctionRef),
      createStep(self.stepAuthorizeFunction),
      createStep(self.stepGetFunctionMap),
      createStep(self.stepInvokeServicesRequest),
      createStep(self.stepFetchFunctionParameters, function() {return context._skipInvokeFunction; }),
      createStep(self.stepInvokeFunction, function() {return context._skipInvokeFunction; }),
      createStep(self.stepProcessResult),
      createStep(self.stepCachePostProcess),
      createStep(self.stepInvokeServicesResult),
      createStep(self.stepTranslateResult),
      createStep(self.stepEndTimer),
      createStep(self.stepEndRequest)
    ], function(result) {
      if(result && cb_result.isType(result) && !result.success) {
        assert(context.res.statusCode != 304);
        if(result.ext && result.ext.httpCode) {
          context.res.statusCode = result.ext.httpCode;
        }
        if(self.setTranslateResultFn) {
          var r = self.setTranslateResultFn(result);
          if(r) {
            result = r;
          }
        }
        context.res.json(result);
      } else {
        var obj = context.resultObject || context.invoke_cb_result;
        if(obj && context.res.statusCode != 304) {
          context.res.json(obj);
        } else {
          context.res.end();
        }
      }
    });
  },
  stepTranslateResult: function(context, cb) {
    if(this.setTranslateResultFn) {
      var res = this.setTranslateResultFn(context.invoke_cb_result);
      if(typeof(res) != "undefined") {
        context.resultObject = res;
      }
    }
    cb(result.success());
  },
  stepProcessResult: function(context, cb) {
    if(!context.invoke_cb_result.success) {
      context.res.removeHeader("date");
      context.res.removeHeader("etag");
      context.res.setHeader('cache-control', "cache-control: private, max-age=0, no-cache");
    }
    if(context.invoke_cb_result.ext && context.invoke_cb_result.ext.httpCode) {
      context.res.statusCode = context.invoke_cb_result.ext.httpCode;
    }
    cb(result.success());
  },
  stepInvokeFunction: function(context, cb) {
    context.args.push(function(err, data) {
      context.invokeResult = {err: err, data: data};
      if(err && cb_result.isType(err)) {
        context.invoke_cb_result = err;
      } else {
        if(err) {
          context.invoke_cb_result = cb_result.error(err);
          context.invoke_cb_result.httpCode = 500;
        }
        else {
          context.invoke_cb_result = cb_result.success(data);
        }
      }
      cb(result.success());
    });
    this.invoke(context.fn, context.handler, context.args);
  },
  stepFetchFunctionParameters: function(context, cb) {
    var args = [];
    var self = this;
    var map = context.map;
    async.timesSeries(map.params.length, function(i, cb) {
      self.getParam(context, map.params[i].name, result.legacycb(cb, function(value) {
        if(typeof(value) === "undefined") {  // not supplied
          return cb(result.errorCode(400, "param [" + map.params[i].name + "] not supplied"));
        }
        //validate type if we have prefix
        var type = map.params[i].prefix;
        if(type && (value != self.emptyValue)) { // has type and is not the special emptyValue that injected variables can return
          var validateResult = validateParams(type, value);
          if(validateResult && validateResult.failed) {
            return cb(result.errorCode(401, "param validation failed name[" + map.params[i].name + "] value[" + value + "]"));
          }
          if(validateResult && typeof(validateResult.value) !== "undefined") {
            value = validateResult.value;
          }
        }
        if(value === self.emptyValue) {
          value = null;
        }
        args.push(value);
        cb();
      }));
    }, result.cb(cb, function() {
      context.args = args;
      cb(result.success());
    }));
  },
  stepInvokeServicesRequest: function(context, cb) {
    this.invokeServices(context, "processRequest", cb);
  },
  stepInvokeServicesResult: function(context, cb) {
    this.invokeServices(context, "processResult", cb);
  },
  invokeServices: function(context, funcName, cb) {
    var self = this;
    async.eachSeries(Object.keys(additionalServices), function(service, cb) {
      if(context.handler[additionalServices[service].constructor.AttachedPropertyName] && context.handler[additionalServices[service].constructor.AttachedPropertyName][funcName]) {
        context.handler[additionalServices[service].constructor.AttachedPropertyName][funcName](context, result.cb(cb, function(brk) {
          if(brk) {
            cb(true);
          } else {
            cb();
          }
        }));
      }
      else if(self.globalClassInstance[additionalServices[service].constructor.AttachedPropertyName] &&
              self.globalClassInstance[additionalServices[service].constructor.AttachedPropertyName][funcName]) {
        self.globalClassInstance[additionalServices[service].constructor.AttachedPropertyName][funcName](context, result.cb(cb, function(brk) {
          if(brk) {
            cb(true);
          } else {
            cb();
          }
        }));
      }
      else {
        cb();
      }
    }, function(brk) {
      if(cb_result.isType(brk)) {
        return cb(brk);
      }
      return cb(cb_result.success(brk))
    });
  },
  stepFillUrlParts: function(context, cb) {
    context.urlParts = context.pathLeft.substring(1).split(this.urlPartRegex);
    if(context.urlParts.length < 1 || !context.urlParts[0]) {
      return cb(result.errorCode(404, "url parts is too small"));
    }
    cb(result.success());
  },
  stepDefaultDisableCache: function(context, cb) {
    context.res.setHeader('cache-control', "cache-control: private, max-age=0, no-cache");
    cb(result.success());
  },
  stepStartTimer: function(context, cb) {
    if(config.httpVerbose) {
      context.__startTime = process.hrtime();
    }
    cb(result.success());
  },
  stepEndTimer: function(context, cb) {
    if(config.httpVerbose) {
      var diff = process.hrtime(context.__startTime);
      context.ms = Math.round((diff[0] * 100000) + (diff[1] / 1e4)) / 100;
    }
    cb(result.success());
  },
  stepHeaderOrigin: function(context, cb) {
    if(context.req.headers.origin) {
      var origin = context.req.headers.origin;
      context.res.setHeader("Access-Control-Allow-Origin", origin); // CORS
      context.res.setHeader("Access-Control-Allow-Credentials", "true");   // cookies
      if(context.req.method == "OPTIONS") {
        if(context.req.headers["access-control-request-headers"]) {
          context.res.setHeader("Access-Control-Allow-Headers", context.req.headers["access-control-request-headers"]);
          context.res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE"); //access-control-request-method
        }
        return cb(result.success(true));
      }
    }
    cb(result.success());
  },
  stepBeforeRequest: function(context, cb) {
    if(this.temporaryHaltJsonResponse) {
      context.resultObject = this.temporaryHaltJsonResponse;
      return cb(result.success(true));
    }
    if(!context.$session) {
      context.$session = new SessionWrapper(context.req);
    }
    cb(result.success());
  },
  stepProcessPing: function(context, cb) {
    if(context.req.path == "/ping" || context.req.path == "/touch") {
      context.resultObject = {date: new Date()};
      return cb(result.success(true));
    }
    cb(result.success());
  },
  stepCachePreProcess: function(context, cb) {
    if(disable304Caching) {
      return cb(result.success());
    }
    var ifNoneMatch = context.req.headers["if-none-match1"] || context.req.headers["if-none-match"];
    if(ifNoneMatch) {
      var eTagObject = null;
      try {
        eTagObject = JSON.parse(JSON.parse(ifNoneMatch));
        if(eTagObject.isTag !== 1) eTagObject = null;
      } catch(err) { }
      if(eTagObject) {
        if(eTagObject.t) {
          var now = new Date().getTime();
          if(now <= eTagObject.t || eTagObject.t === -1) {
            if(!eTagObject.c) { // time not passed and no checksum, trigger 304
              context.res.statusCode = 304;
              context.res.statusText = "304 not modified";
              context.skipInvokeFunction();
              return cb(result.success());
            } else {
              context.eTagChecksum = eTagObject.c
            }
          }
        }
      }
    }
    return cb(result.success());
  },
  stepFindInstance: function(context, cb) {
    this.getHandler(context.req.path, result.cb(cb, function(data) {
      _.merge(context, data);
      cb(result.success());
    }));
  },
  stepCheckNewSession: function(context, cb) {
    if(!context.$session.has("___newSessionKJHD3254")) {
      context.$session.set("___newSessionKJHD3254", true);
      if(this.newSessionFn) {
        return this.callNewSessionFn(context, cb);
      }
    }
    cb(result.success());
  },
  setTranslateResultFunction: function(fn) {
    if(!fn) {
      this.setTranslateResultFn = null;
    } else {
      this.setTranslateResultFn = fn;
    }
  },
  stepCachePostProcess: function(context, cb) {
    if(disable304Caching || !context.invoke_cb_result.success) {
      return cb(result.success());
    }
    var cbresult = context.invoke_cb_result;
    if(cbresult.cache && cbresult.cache.seconds) {
      // cache is requested
      var t;
      context.res.setHeader('Date', new Date().toUTCString());
      if(cbresult.cache.seconds === -1) {// always revalidate using checksum always
        context.res.setHeader('cache-control', "cache-control: private, max-age=0, no-cache");
        t = -1;
      } else {
        context.res.setHeader('cache-control', "public, max-age=" + cbresult.cache.seconds); // in seconds
        t = (new Date()).getTime() + (cbresult.cache.seconds * 1000);
      }
      var ifNoneMatch = context.req.headers["if-none-match1"] || context.req.headers["if-none-match"];
      if(cbresult.cache.checksum) {
        // caching with checksum
        //logger.log(JSON.stringify(req.headers, null, 2));
        if(ifNoneMatch) {
          var eTagObject = null;
          try {
            eTagObject = JSON.parse(JSON.parse(ifNoneMatch));
            if(eTagObject.isTag !== 1) eTagObject = null;
          } catch(err) { }
          if(eTagObject) {
            if(eTagObject.c === cbresult.cache.checksum) {
              if(eTagObject.t) {
                var now = new Date().getTime();
                if(now <= eTagObject.t || eTagObject.t === -1) {
                  context.res.statusCode = 304;
                  context.res.statusText = "304 not modified";
                  context.skipInvokeFunction();
                  return cb(result.success());
                }
              }
            }
          }
        }
        context.res.setHeader('etag', JSON.stringify(JSON.stringify({isTag: 1, c: cbresult.cache.checksum, t: t})));
      } else {
        // blind caching
        context.res.setHeader('etag', JSON.stringify(JSON.stringify({isTag: 1, t: t})));
      }
      delete cbresult.cache;
    }
    cb(result.success());
  },
  stepEndRequest: function(context, cb) {
    if(!config.httpVerbose || !colors) { //0 or null
      return cb(result.success());
    }
    try {
      var ms = context.ms;
      var finalResult = context.resultObject || context.invoke_cb_result;
      var cacheable = context.res.getHeader("etag") || context.res.statusCode == 304;
      var cacheHit = context.res.statusCode === 304;
      if(cacheHit) {
        finalResult = "";
      } else {
        finalResult = JSON.stringify(finalResult, null, 2);
      }
      var hitRate = "";
      if(cacheable) hitRate = this.getHitRate(context.req.url, cacheHit).grey;
      var contentLength = "";
      if(context.res.getHeader("content-length")) {
        contentLength = " (SIZE:" + context.res.getHeader("content-length") + ")";
      }
      var ip = context.req.ip ? context.req.ip : "N/A";
      console.log("── " + "Nodetastic ".blue + "─".repeat(65));
      console.log("IP:".blue, ip.grey, "timestamp:".blue, (new Date().toLocaleTimeString()).grey, "time:".blue, (ms +
                                                                                                                 "ms").grey, cacheable ? "[HTTP CACHEABLE]".magenta : "", (cacheHit ? "[CACHE HIT] ".cyan : "") +
                                                                                                                                                                          hitRate);
      var sessionId = (context.$session.getId()) ? "{session:" + context.$session.getId() + "} " : "";
      //request
      if(config.httpVerbose >= 2) {
        console.log(">>>>", context.req.method.toUpperCase().yellow.underline, context.req.url, sessionId.grey);
        if(config.httpVerbose >= 3) {
          // print out headers
          console.log("headers: ".blue, JSON.stringify(context.req.headers, null, 1));
        }
        console.log("query: ".blue, JSON.stringify(context.req.query, null, 1));
        console.log("body:  ".blue, JSON.stringify(context.req.body, null, 1));
      } else {
        console.log(">>>>", context.req.method.toUpperCase().yellow.underline, context.req.url, sessionId.grey);
      }
      //logger.debug("request", req.ip, cacheable ? "cacheable" : "not-cacheable", sessionId, req.method);
      //response
      if(config.httpVerbose >= 2) {
        console.log('<<<<', (context.res.statusCode === 304 ? ("" + context.res.statusCode).cyan : ("" + context.res.statusCode).yellow), (cacheHit ||
                                                                                                                                           (cb_result.isType(context.invoke_cb_result) &&
                                                                                                                                            context.invoke_cb_result.success)) ? finalResult.green : finalResult.red);
      } else {
        var resultErrorText = context.invoke_cb_result.error;
        if(typeof(resultErrorText) === "object") {
          resultErrorText = JSON.stringify(resultErrorText);
        }
        console.log('<<<<', (context.res.statusCode === 304 ? ("" + context.res.statusCode).cyan : ("" + context.res.statusCode).yellow) + contentLength.grey, (cacheHit ||
                                                                                                                                                                (cb_result.isType(context.invoke_cb_result) &&
                                                                                                                                                                 context.invoke_cb_result.success)) ? ("success".green) : ("error: " +
                                                                                                                                                                                                                           (cb_result.isType(context.invoke_cb_result) ? resultErrorText : result)).red);
      }
      console.log("─".repeat(80));
    } catch(err) {
    }
    cb();
  },
  getHitRate: function(url, hit) {
    if(!this.__cacheHitRate) {
      this.__cacheHitRate = {};
    }
    if(!this.__cacheHitRate[url]) {
      this.__cacheHitRate[url] = {total: 0, hit: 0};
    }
    this.__cacheHitRate[url].total++;
    this.__cacheHitRate[url].hit += (hit ? 1 : 0);
    var hitRate = Math.round(this.__cacheHitRate[url].hit / this.__cacheHitRate[url].total * 10000) / 100;
    return "[RATE: (" + this.__cacheHitRate[url].hit + "/" + this.__cacheHitRate[url].total + ") " + hitRate + "%]";
  },
  getHandler: function(path, cb) {
    // it is possible to denote the first part of the url and link it with a class name, this way, and it is possible to omit that
    // the process request can spawn different classes based on the need, effectively adding another dimension to "http serving requests".
    path = decodeURI(path).replace('+', ' ');
    var classRegistryValue = this.classRegistry.get(path);
    if(!classRegistryValue.value) {
      classRegistryValue = this.classRegistry.getEmptyPath(path);
    }
    if(!classRegistryValue.value) {
      return cb(result.errorCode(404, "couldn't find handler"));
    }
    cb(result.success({pathLeft: classRegistryValue.pathLeft, handler: classRegistryValue.value, name: classRegistryValue.pathConsumed}));
  },
  invoke: function(fn, self, args) {
    // Performance optimization: http://jsperf.com/apply-vs-call-vs-invoke
    switch(self ? -1 : args.length) {
      case  0:
        return fn();
      case  1:
        return fn(args[0]);
      case  2:
        return fn(args[0], args[1]);
      case  3:
        return fn(args[0], args[1], args[2]);
      case  4:
        return fn(args[0], args[1], args[2], args[3]);
      case  5:
        return fn(args[0], args[1], args[2], args[3], args[4]);
      case  6:
        return fn(args[0], args[1], args[2], args[3], args[4], args[5]);
      case  7:
        return fn(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
      case  8:
        return fn(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
      case  9:
        return fn(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
      case 10:
        return fn(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9]);
      default:
        return fn.apply(self, args);
    }
  },
  callNewSessionFn: function(context, cb) {
    var self = this;
    self.getParam(context, "$inject", result.cb(cb, function($inject) {
      self.newSessionFn($inject, cb);
    }));
  },
  stepGetFunctionMap: function(context, cb) {
    var map = context.handler.map;
    if(!map) {
      context.handler.map = {};
      map = context.handler.map;
    }
    if(map[context.functionName] == null) {
      map[context.functionName] = {};
    }
    if(!map[context.functionName].params) {
      // we need to discover the parameters of the function
      var obj = this.fillInParams(context.fn, 0, 1);
      if(obj.totalArgsCount < 1) {
        throw new Error("functions of HandlerClass should have at least 1 parameter: cb");
      }
      map[context.functionName].params = obj.args;
      map[context.functionName].meta = obj.meta;
    }
    context.map = map[context.functionName];
    cb(result.success());
  },
  stepExtractUrlVariables: function(context, cb) {
    context.urlParams = [];
    for(var i = context.urlParts.length - 1; i >= 0; i--) {
      if(context.urlParts[i].indexOf("$") === 0) {
        context.urlParams.push(context.urlParts[i].substring(1));
        context.urlParts.splice(i, 1);
      }
    }
    context.urlParams.reverse();
    cb(result.success())
  },
  stepGetFunctionName: function(context, cb) {
    context.functionName = context.urlParts.join("/");
    context.urlParts = [];
    cb(result.success());
  },
  stepGetFunctionRef: function(context, cb) {
    function resolveFromNameFromHandler() {
      var functionNameParts = context.functionName.split("/");
      var fn = context.handler;
      for(var i = 0; fn && i < functionNameParts.length; i++) {
        fn = fn[functionNameParts[i]];
        if(!fn) {
          break;
        }
      }
      context.fn = fn;
      if(!context.fn) {
        return cb(result.errorCode(404, "could not find function"));
      }
      cb(result.success());
    }

    if(context.handler && context.handler.$getFunction) {
      // an advanced method that allows fetching dynamic functions/modifying functionName/modifying urlParts left
      context.handler.$getFunction({req: context.req, functionName: context.functionName}, result.cb(cb, function(data) {
        if(data) {
          context.fn = data.fn;
          if(data.functionName) {
            context.functionName = data.functionName;
          }
          if(data.urlParts) {
            context.urlParts = data.urlParts;
          }
          return cb(result.success());
        }
        resolveFromNameFromHandler();
      }));
    }
    else {
      resolveFromNameFromHandler();
    }
  },
  stepAuthorizeFunction: function(context, cb) {
    if(context.handler && context.handler.$authorizeFunction) {
      context.handler.$authorizeFunction(context, result.cb(cb, function(data) {
        if(!data) {
          cb(result.errorCode(403, "authorization failed"));
        }
        else {
          cb(result.success());
        }
      }));
    }
    else {
      cb(result.success());
    }
  },
  getParam: function(context, param, cb) {
    var self = this;
    self.getReservedValues(context, param, null, result.cb(cb, function(value) {
      if((typeof(value) !== "undefined" && value !== null) || value === self.emptyValue) {
        return cb(result.success(value));
      }
      if(context.req.method === "POST" || context.req.method === "PUT") {
        value = context.req.body[param];
      }
      if(value === null || value === undefined) {
        value = context.req.query[param];
      }
      cb(result.success(value));
    }));
  },
  getReservedValues: function(context, param, circularDependency, cb) {
    if(circularDependency) {
      circularDependency.detect(param);
    }
    if(!circularDependency) {
      circularDependency = new CircularDependency(param);
    }
    var fn = this.reservedValuesHash[this.metaNameStrip(param)];
    if(!fn) {
      return cb(result.success(null));
    }
    // discover
    if(!fn.params) {
      var r = this.fillInParams(fn, 2, 0);
      fn.params = r.args;
      fn.meta = r.meta;
    }
    // send additional args
    var args = [];
    if(param === "$inject") {
      args.push({self: this, context: context, circularDependency: circularDependency});
    } // special case only for $inject
    else {
      args.push(context);
      args.push(param);
    }
    var self = this;
    var isAsync = fn.params.length >= 1 && fn.params[fn.params.length - 1].name == "cb";
    async.timesSeries(fn.params.length - (isAsync ? 1 : 0), function(i, cb) {
      self.getReservedValues(context, fn.params[i].name, new CircularDependency(fn.params[i].name, circularDependency), result.legacycb(cb, function(value) {
        args.push(value);
        cb();
      }));
    }, result.cb(cb, function() {
      if(isAsync) {
        args.push(result.cb(cb));
        self.invoke(fn, null, args);
      } else {
        var res = self.invoke(fn, null, args);
        if(cb_result.isType(res)) {
          return cb(res);
        }
        else {
          return cb(result.success(res));
        }
      }
    }));
  },
  metaNameStrip: function(name) {
    // dependency injection of reserved values, starts with $, anything after second $ is considered as delimiter, possibly for meta data
    var next = name.indexOf('$', 2);
    return (next != -1) ? name.substring(0, next) : name;
  },
  emptyValue: $emptyValue, // for reserved values
  urlPartRegex: /\//,
  hungarianNotationPart: /^([a-z]+)[A-Z]+/,
  fillInParamsRegex: {
    FN_ARGS: /^function\s*[^\(]*\(\s*([^\)]*)\)/m, FN_ARG_SPLIT: /,/, FN_ARG: /^\s*(_?)(\S+?)\1\s*$/, STRIP_COMMENTS: /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
    GET_META: /<meta>(.*)<\/meta>/i
  },
  fillInParams: function(fn, ignoreFirst, ignoreLast) {
    // this function will discover the target function parameters/meta data and the result is cached, it is the core of dependency injection
    var array = [];
    var fnText = fn.toString();
    var meta = null;
    var metaDeclaration = fnText.match(this.fillInParamsRegex.GET_META);
    if(metaDeclaration && metaDeclaration[1]) {
      try { meta = JSON.parse(metaDeclaration[1]); } catch(err) {
        logger.warn("Meta data was invalid: " + metaDeclaration[1]);
      }
    }
    if(!ignoreFirst) ignoreFirst = 0;
    if(!ignoreLast) ignoreLast = 0;
    var fnText = fnText.replace(this.fillInParamsRegex.STRIP_COMMENTS, '');
    var argDeclaration = fnText.match(this.fillInParamsRegex.FN_ARGS);
    var arg = [];
    if(argDeclaration[1]) {
      arg = argDeclaration[1].split(this.fillInParamsRegex.FN_ARG_SPLIT);
    }
    var self = this;
    for(var x = ignoreFirst; x < arg.length - ignoreLast; x++) { // ignore last one, should be cb
      (function(arg) {
        arg.replace(self.fillInParamsRegex.FN_ARG, function(all, underscore, name) {
          var element = {};
          element.name = name;
          if(name.indexOf("$") == 0) { // starts with $, reserved parameters
            array.push(element);
          } else {
            var type = name.match(self.hungarianNotationPart);
            if(!allowedUntyped && (type == null || type.length != 2)) {
              throw new Error("Could not find type of parameter \"" + name + "\"");
            }
            element.prefix = type && type[1];
            array.push(element);
          }
        });
      })(arg[x]);
    }
    return {args: array, meta: meta, totalArgsCount: arg.length};
  },
  __end: 0
}
;

module.exports = {
  CreateNodeTastic: function() {
    return new NodeTastic();
  }
};
