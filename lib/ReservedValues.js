/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

"use strict";

var $emptyValue = require("./EmptyValue.js");
var HttpCacheIndicator = require("./HttpCacheIndicator.js");
var cacheEngine = require('./cache.js');
var result = require('cb-result');
var _ = require("lodash");

/* note, it is not advised to use $request/$response directly, good programming practise shall not use them, this will allow you to exchange transport layers without changing your code */
module.exports = {
  $serverTiming: function(context) {
    return function(name, description, callback) {
      const start = process.hrtime();
      return function() {
        if(!context.serverTiming) {
          context.serverTiming = [];
        }
        context.serverTiming.push({name: name, desc: description, value: (getTimeDiff(start) / 1000.0)});
        if(callback) {
          return callback.apply(this, arguments);
        }
      }
    }
  },
  $request: function(context) { return context.req; },
  $response: function(context) { return context.res; },
  $files: function(context) { return context.req.files; },
  $session: function(context) { return context.$session; },
  $method: function(context) { return context.req.method; },
  $path: function(context) { return context.req.path; },
  $body: function(context) { return context.req.body; },
  $query: function(context) { return context.req.query; },
  $eTagChecksum: function(context) { return context.eTagChecksum ? context.eTagChecksum : $emptyValue; },
  $cache: cacheEngine.getInjectionFunction(),
  $urlParams: function(context) { return context.urlParams ? context.urlParams : $emptyValue }, // url variables
  $HttpCacheIndicator: function() { return HttpCacheIndicator },
  $data: function(context) {
    var data = {};
    _.assign(data, context.req.query);
    _.assign(data, context.req.body);
    return data;
  },
  $inject: function(specialObj) {
    // $inject is a special case, it is sent different data in it's obj
    return {
      get: function(param, cb) {
        specialObj.self.getReservedValues(specialObj.context, param, specialObj.circularDependency, result.cb(cb, function(value) {
          if(value === $emptyValue) {
            cb(result.success(null));
          } else {
            cb(result.success(value));
          }
        }));
      }
    }
  }
};

function getTimeDiff(start) {
  const diff = process.hrtime(start);
  return Math.round((diff[0] * 100000) + (diff[1] / 1e4)) / 100;
}