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
'use strict';

var http = require('http');
var _ = require('lodash');
var result = require('cb-result');
var cb_result = result;

var logger = require('../logger.js');
var validateParams = require('./ValidateParams.js');
var SessionWrapper = require("./SessionWrapper");
var jsonSchemas = require("./PrefixSchemas.js");

var colors = null;
try { colors = require("colors"); } catch(err) { logger.warn("module 'colors' is missing, httpVerbose will be off"); }

//<editor-fold defaultstate="collapsed" desc="options">
var fullUrlIsFunctionName = true;  //*/ must remove this
var allowedUntyped = require('../config.js').allowedUntyped;
var disable304Caching = require('../config.js').disable304Caching;
//</editor-fold>

//<editor-fold defaultstate="collapsed" desc="extending string prototype">
String.prototype.repeat = function(count) {
  var res = "";
  while(count--) res += this;
  return res;
};
//</editor-fold>

//<editor-fold defaultstate="collapsed" desc="a Mechanism to extend the layer with additional services, they are more powerful than injected variables">
var additionalServices = require("./LoadServices.js");
//</editor-fold>

//<editor-fold defaultstate="collapsed" desc="The default reserved values that can be injected">
var $emptyValue = require("./EmptyValue.js");
var defaultReservedValuesHash = require("./ReservedValues.js");
//</editor-fold>

//<editor-fold defaultstate="collapsed" desc="The data structure used for class registry">
var ClassRegistryDataStructure = require("./ClassRegistry.js");
//</editor-fold>

//<editor-fold defaultstate="collapsed" desc="a class used within the ReservedWords services to detect circular references">
var CircularDependency = require("./CircularDependency.js");
//</editor-fold>

function NodeTastic(opts) {
  //*/ remove opts

  this.IsNodeTastic = true;
  this.classRegistry = new ClassRegistryDataStructure();
  this.prepareReservedValues();
  this.opts = opts ? opts : {};
  if(this.opts.verbose) {
    logger.info("[NodeTastic: verbose mode ON]");
  }
}

NodeTastic.prototype = {
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
  registerClass: function(name, classInstance) {
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
    var instance = classInstance[service.constructor.AttachedPropertyName] = new service.constructor(this, opts);
    return instance;
  },
  attachServiceInstance: function(classInstance, instance) {
    if(!instance || !instance.IsService) {
      throw new Error("Invalid service given to AttachServiceInstance");
    }
    classInstance[instance.constructor.AttachedPropertyName] = instance;
  },
  setGlobalPrefix: function(prefix) {
    if(prefix.indexOf[0] === "/") {
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
  createServer: function(port, ip) {
    http.createServer(this.getRouteRequestFunction()).listen(port, ip);
  },
  routeRequest: function(req, res) {
    if(req.headers.origin) {
      var origin = req.headers.origin;
      res.setHeader("Access-Control-Allow-Origin", origin); // CORS
      res.setHeader("Access-Control-Allow-Credentials", "true");   // cookies
      if(req.method == "OPTIONS") {
        if(req.headers["access-control-request-headers"]) {
          res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"]);
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE"); //access-control-request-method
        }
        res.end();
        return;
      }
    }
    if(this.opts.verbose) {
      req.__startTime = process.hrtime();
    }
    this.continueRouteRequest(req, res);
  },
  translateResult: function(result) {
    if(this.setTranslateResultFn) {
      return this.setTranslateResultFn(result);
    }
    return result;
  },
  setTranslateResultFunction: function(fn) {
    if(!fn) {
      this.setTranslateResultFn = null;
    } else {
      this.setTranslateResultFn = fn;
    }
  },
  continueRouteRequest: function(req, res) {
    if(this.beforeRequest(req, res)) {
      return;
    }
    var self = this;
    try {
      // send by default do not cache (for the benefit of IE which is being too optimistic!)
      res.setHeader('cache-control', "cache-control: private, max-age=0, no-cache");
      this.findInstanceAndProcess(req, res, function(cbresult, data) {
        if(res._cbCalled) {
          throw new Error('You are calling the "callback" function more than once!');
        }
        res._cbCalled = true;
        // cb should either result IsResult object, or a generic data object, in which case we wrap it here
        // so nothing gets pass this point without being properly formatted
        if(cbresult && !cb_result.isType(cbresult)) {
          cbresult = result.error(cbresult);
          cbresult.httpCode = 500; // serious unhandled/unintended error
        } else if(!cbresult && data) {
          cbresult = result.successRaw(data);
        }
        if(cbresult) {
          if(!self.beforeResponse(req, res, cbresult)) {
            var httpRet = self.translateResult(cbresult);
            //<editor-fold defaultstate="collapsed" desc="check global attached services, give them a chance to process final result">
            if(req.dhmRequest) {
              for(var service in additionalServices) {
                if(self.globalClassInstance.hasOwnProperty(additionalServices[service].constructor.AttachedPropertyName)) {
                  if(self.globalClassInstance[additionalServices[service].constructor.AttachedPropertyName].processResult) {
                    self.globalClassInstance[additionalServices[service].constructor.AttachedPropertyName].processResult(self.getParam(req.dhmRequest, "$session"), httpRet);
                  }
                }
              }
            }
            //</editor-fold>
            if(cbresult.httpCode) {
              res.statusCode = cbresult.httpCode;
            }
            if(!cbresult.success) {
              res.removeHeader("date");
              res.removeHeader("etag");
              res.setHeader('cache-control', "cache-control: private, max-age=0, no-cache");
            }
            res.json(httpRet);
            self.beforeHttpReturn(req, res, cbresult, httpRet);
          } else {
            self.beforeHttpReturn(req, res, cbresult);
          }
        } else {
          res.end("generic dev error");
        }
      });
    } catch(e) {
      //logger.error(e);
      res.statusCode = 500; // serious unhandled/unintended error
      var err = result.error(e);
      res.json(self.translateResult(err));
    }
  },
  cachePreProcess: function(req, res) {
    if(disable304Caching) {
      return false;
    }
    var ifNoneMatch = req.headers["if-none-match1"] || req.headers["if-none-match"];
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
              res.statusCode = 304;
              res.statusText = "304 not modified";
              res.end();
              return true;
            } else {
              req.eTagChecksum = eTagObject.c
            }
          }
        }
      }
    }
    return false;
  },
  cachePostProcess: function(req, res, cbresult) {
    if(disable304Caching || !cbresult.success) {
      return false;
    }
    if(cbresult.cache && cbresult.cache.seconds) {
      // cache is requested
      var t;
      res.setHeader('Date', new Date().toUTCString());
      if(cbresult.cache.seconds === -1) {// always revalidate using checksum always
        res.setHeader('cache-control', "cache-control: private, max-age=0, no-cache");
        t = -1;
      } else {
        res.setHeader('cache-control', "public, max-age=" + cbresult.cache.seconds); // in seconds
        t = (new Date()).getTime() + (cbresult.cache.seconds * 1000);
      }
      var ifNoneMatch = req.headers["if-none-match1"] || req.headers["if-none-match"];
      if(cbresult.cache.checksum) {
        // caching with checksum
        //console.log(JSON.stringify(req.headers, null, 2));
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
                  res.statusCode = 304;
                  res.statusText = "304 not modified";
                  res.end();
                  return true;
                }
              }
            }
          }
        }
        res.setHeader('etag', JSON.stringify(JSON.stringify({isTag: 1, c: cbresult.cache.checksum, t: t})));
      } else {
        // blind caching
        res.setHeader('etag', JSON.stringify(JSON.stringify({isTag: 1, t: t})));
      }
      delete cbresult.cache;
    }
    return false;
  },
  beforeRequest: function(req, res) {
    if(this.temporaryHaltJsonResponse) {
      res.json(this.temporaryHaltJsonResponse);
      return true;
    }
    if(!req.$session) {
      req.$session = new SessionWrapper(req);
    }
    if(this.cachePreProcess(req, res)) {
      return true;
    }
    if(req.path == "/ping" || req.path == "/touch") {
      res.json({date: new Date()});
      return true;
    }
  },
  beforeResponse: function(req, res, cbresult) {
    //res.header("Content-Type", "application/json; charset=utf-8");
    return this.cachePostProcess(req, res, cbresult);
  },
  beforeHttpReturn: function(req, res, result, translatedResult) {
    if(!this.opts.verbose || !colors) { //0 or null
      return;
    }
    try {
      var diff = process.hrtime(req.__startTime);
      var ms = Math.round((diff[0] * 100000) + (diff[1] / 1e4)) / 100;
      var finalResult = translatedResult ? translatedResult : result;
      var cacheable = res.getHeader("etag") || res.statusCode == 304;
      var cacheHit = res.statusCode === 304;
      if(cacheHit) {
        finalResult = "";
      } else {
        finalResult = JSON.stringify(finalResult, null, 2);
      }
      var hitRate = "";
      if(cacheable) hitRate = this.getHitRate(req.url, cacheHit).grey;
      var contentLength = "";
      if(res.getHeader("content-length")) {
        contentLength = " (SIZE:" + res.getHeader("content-length") + ")";
      }
      var ip = req.ip ? req.ip : "N/A";
      console.log("── " + "Portal ".blue + "─".repeat(70));
      console.log("IP:".blue, ip.grey, "timestamp:".blue, (new Date().toLocaleTimeString()).grey, "time:".blue, (ms +
                                                                                                                 "ms").grey, cacheable ? "[HTTP CACHEABLE]".magenta : "", (cacheHit ? "[CACHE HIT] ".cyan : "") +
                                                                                                                                                                          hitRate);
      var sessionId = (req.$session.getId()) ? "{session:" + req.$session.getId() + "} " : "";
      //request
      if(this.opts.verbose >= 2) {
        console.log(">>>>", req.method.toUpperCase().yellow.underline, req.url, sessionId.grey);
        if(this.opts.verbose >= 3) {
          // print out headers
          console.log("headers: ".blue, JSON.stringify(req.headers, null, 1));
        }
        console.log("query: ".blue, JSON.stringify(req.query, null, 1));
        console.log("body:  ".blue, JSON.stringify(req.body, null, 1));
      } else {
        console.log(">>>>", req.method.toUpperCase().yellow.underline, req.url, sessionId.grey);
      }
      //logger.debug("request", req.ip, cacheable ? "cacheable" : "not-cacheable", sessionId, req.method);
      //response
      if(this.opts.verbose >= 2) {
        console.log('<<<<', (res.statusCode === 304 ? ("" + res.statusCode).cyan : ("" + res.statusCode).yellow), (cacheHit ||
                                                                                                                   (result &&
                                                                                                                    cb_result.isType(result) &&
                                                                                                                    result.success)) ? finalResult.green : finalResult.red);
      } else {
        var resultErrorText = result.error;
        if(typeof(resultErrorText) === "object") {
          resultErrorText = JSON.stringify(resultErrorText);
        }
        console.log('<<<<', (res.statusCode === 304 ? ("" + res.statusCode).cyan : ("" + res.statusCode).yellow) + contentLength.grey, (cacheHit ||
                                                                                                                                        (result &&
                                                                                                                                         cb_result.isType(result) &&
                                                                                                                                         result.success)) ? ("success".green) : ("error: " +
                                                                                                                                                                                 (result &&
                                                                                                                                                                                  cb_result.isType(result) ? resultErrorText : result)).red);
      }
      console.log("─".repeat(80));
      //logger.debug("response", res.statusCode, cacheHit ? "cache hit" : "cache not hit");
    } catch(err) {
    }
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
  getClassName: function(path) {
    // it is possible to denote the first part of the url and link it with a class name, this way, and it is possible to omit that
    // the process request can spawn different classes based on the need, effectively adding another dimension to "http serving requests".
    path = decodeURI(path).replace('+', ' ');
    var classRegistryValue = this.classRegistry.get(path);
    if(!classRegistryValue.value) {
      classRegistryValue = this.classRegistry.getEmptyPath(path);
    }
    if(!classRegistryValue.value) {
      return result.errorCode(200, "couldn't find class");
    }
    return { path: classRegistryValue.pathLeft, classInstance: classRegistryValue.value, name: classRegistryValue.pathConsumed };
  },
  findInstanceAndProcess: function(req, res, cb) {
    var result = this.getClassName(req.path);
    if(cb_result.isType(result)) {
      return cb(result);
    }
    this.callFunctionOnInstance(result.name, result.classInstance, result.path, req, res, cb);
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
  callNewSessionFn: function(request, cb) {
    var self = this;
    self.newSessionFn(self.getParam(request, "$inject"), function() {
      try {
        self.callFunctionOnInstance(request.className, request.classInstance, request.path, request.req, request.res, cb);
      } catch(e) {
        e = result.error(e);
        e.httpCode = 500;
        cb(e);
      }
    });
  },
  callFunctionOnInstance: function(className, classInstance, path, req, res, cb) {
    var request = {
      req: req,
      res: res,
      classInstance: classInstance,
      className: className,
      data: req.query,
      path: path,
      urlParts: null,
      functionName: null,
      fn: null
    };
    req.dhmRequest = request;

    //<editor-fold defaultstate="collapsed" desc="new session code and checking the event newSessionFn">
    if(!req.$session.has("___newSessionKJHD3254")) {
      req.$session.set("___newSessionKJHD3254", true);
      if(this.newSessionFn) {
        return this.callNewSessionFn(request, cb);
      }
    }
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="split and fill urlParts">
    request.urlParts = request.path.substring(1).split(this.urlPartRegex);
    if(request.urlParts.length < 1 || request.urlParts[0] == '') {
      return cb(result.errorCode(200, "url parts is too small"));
    }
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="extract url parts that are denoted as variables">
    this.extractUrlVariables(request);
    //request.urlWithoutVariables = request.urlParts.join("/");
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="get function name">
    this.getFunctionName(request);
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="get the function reference">
    if(!this.getFunction(request)) {
      return cb(result.errorCode(200, "could not find function"));
    }
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="check if function is allowed">
    if(!this.authorizeFunction(request)) {
      return cb(result.errorCode(403, "authorization failed"));
    }
    //</editor-fold>

    this.getFunctionMap(request);

    //<editor-fold defaultstate="collapsed" desc="check attached services, give them a chance to process requests">
    for(var service in additionalServices) {
      if(classInstance.hasOwnProperty(additionalServices[service].constructor.AttachedPropertyName)) {
        var ret = classInstance[additionalServices[service].constructor.AttachedPropertyName].processRequest(this.getParam(request, "$session"), request);
        if(ret && cb_result.isType(ret)) {
          return cb(ret);
        }
      } else if(this.globalClassInstance.hasOwnProperty(additionalServices[service].constructor.AttachedPropertyName)) {
        var ret = this.globalClassInstance[additionalServices[service].constructor.AttachedPropertyName].processRequest(this.getParam(request, "$session"), request);
        if(ret && cb_result.isType(ret)) {
          return cb(ret);
        }
      }
    }
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="get the function map (defines parameter names and maps url parts->variables), inject path variables if exists, also defines ">
    var map = request.map;
    if(!fullUrlIsFunctionName && map.meta && map.meta.url) { // regex url into data
      var url = map.meta.url;
      if(url === '/') {
        url = url.substring(1);
      }
      var urlMapParts = url.split(this.urlPartRegex);
      if(urlMapParts.length != request.urlParts.length) {
        cb(result.errorCode(200, "expecting " + (urlMapParts.length + 1) + " parts"));
        return;
      }
      for(var i = 0; i < urlMapParts.length; i++) {
        request.data[urlMapParts[i]] = request.urlParts[i];
      }
    }
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="create the arguments array and validate them">
    var args = new Array();
    for(var i = 0; i < map.params.length; i++) {
      var value = this.getParam(request, map.params[i].name);
      if(typeof(value) === "undefined") {  // not supplied
        return cb(result.errorCode(400, "param [" + map.params[i].name + "] not supplied"));
      }
      if(value && cb_result.isType(value)) { // give a chance for reserved values to return errors
        return cb(value);
      }
      var type = map.params[i].prefix;
      if(type && (value != this.emptyValue)) { // has type and is not the special emptyValue that injected variables can return
        var validateResult = validateParams(type, value);
        if(validateResult && validateResult.failed) {
          cb(result.errorCode(401, "param validation failed name[" + map.params[i].name + "] value[" + value + "]"));
          return;
        }
        if(validateResult && typeof(validateResult.value) !== "undefined") {
          value = validateResult.value;
        }
      }
      if(value === this.emptyValue) {
        value = null;
      }
      args.push(value);
    }
    args.push(cb);
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="invoke the function with the instance and created arguments">
    this.invoke(request.fn, request.classInstance, args);
    //</editor-fold>
  },
  getFunctionMap: function(request) {
    // a function map contains params=(it's argument list), meta=(parse object from meta data comments format)
    var map = request.classInstance.$getFunctionsMap && request.classInstance.$getFunctionsMap();
    if(!map) {
      if(!request.classInstance.map) {
        request.classInstance.map = {};
      }
      map = request.classInstance.map;
    }
    if(map[request.functionName] == null) {
      map[request.functionName] = {};
    }
    if(!map[request.functionName].params) {
      var obj = this.fillInParams(request.fn, 0, 1);
      if(obj.totalArgsCount < 1) {
        throw new Error("functions of HandlerClass should have at least 1 parameter: cb ");
      }
      map[request.functionName].params = obj.args;
      map[request.functionName].meta = obj.meta;
    }
    request.map = map[request.functionName];
  },
  extractUrlVariables: function(request) {
    request.urlParams = [];
    for(var i = request.urlParts.length - 1; i >= 0; i--) {
      if(request.urlParts[i].indexOf("$") === 0) {
        request.urlParams.push(request.urlParts[i].substring(1));
        request.urlParts.splice(i, 1);
      }
    }
    request.urlParams.reverse();
  },
  getFunctionName: function(request) {
    if(!fullUrlIsFunctionName) {
      request.functionName = request.urlParts[0];
      if(request.functionName.indexOf("$") == 0) { // can not access reserved functions
        request.functionName = request.functionName.substring(1);
      }
      request.urlParts = request.urlParts.slice(1);
    } else {
      request.functionName = request.urlParts.join("/"); // use whatever is left
      if(request.functionName.indexOf("$") == 0) { // can not access reserved functions
        request.functionName = request.functionName.substring(1);
      }
      request.urlParts = [];
    }
  },
  getFunction: function(request) {
    if(request.classInstance && request.classInstance.$getFunction) {
      var fnObj = request.classInstance.$getFunction(request.req, request.functionName); // an advanced method that allows fetching dynamic functions/modifying functionName/modifying urlParts left
      if(fnObj) {
        request.fn = fnObj.fn;
        request.functionName = fnObj.functionName;
        if(fnObj.urlParts) // if defined, overwrite.
        {
          request.urlParts = fnObj.urlParts;
        }
        return true;
      }
    }
    request.fn = request.classInstance[request.functionName];
    return request.fn != null;
  },
  authorizeFunction: function(request) {
    if(request.classInstance && request.classInstance.$authorizeFunction) {
      return request.classInstance.$authorizeFunction(request);
    }
    return true;
  },
  getParam: function(request, param) {
    var value = this.getReservedValues(request, param);
    if((typeof(value) !== "undefined" && value !== null) || value === this.emptyValue) {
      return value;
    }
    if(request.req.method === "POST" || request.req.method === "PUT") {
      value = request.req.body[param];
    }
    if(value === null || value === undefined) {
      value = request.data[param];
    }
    return value;
  },
  getReservedValues: function(request, param, circularDependency) {
    if(circularDependency) {
      circularDependency.detect(param);
    }
    var obj = {
      req: request.req,
      res: request.res,
      param: param,
      className: request.className,
      classInstance: request.classInstance,
      urlParams: request.urlParams
    };
    if(!circularDependency) {
      circularDependency = new CircularDependency(param);
    }
    var fn = this.reservedValuesHash[this.metaNameStrip(param)];
    if(!fn) {
      return null;
    }
    // discover
    if(!fn.params) {
      var r = this.fillInParams(fn, 1, 0);
      fn.params = r.args;
      fn.meta = r.meta;
    }
    // send additional args
    var args = new Array();
    if(param === "$inject") {
      args.push({self: this, request: request, circularDependency: circularDependency});
    } // special case only for $inject
    else {
      args.push(obj);
    }
    for(var i = 0; i < fn.params.length; i++) {
      args.push(this.getReservedValues(request, fn.params[i].name, new CircularDependency(fn.params[i].name, circularDependency)));
    }
    // invoke
    return this.invoke(fn, null, args);
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
};

module.exports = {
  CreateNodeTastic: function(opts) {
    return new NodeTastic(opts);
  }
};
