/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

"use strict";

var $emptyValue = require("./EmptyValue.js");
var HttpCacheIndicator = require("./HttpCacheIndicator.js");
var cacheEngine = require('./cache.js');

/* note, it is not advised to use $request/$response directly, good programming practise shall not use them, this will allow you to exchange transport layers without changing your code */
module.exports = {
  $request: function(obj) { return obj.req; },
  $response: function(obj) { return obj.res; },
  $files: function(obj) { return obj.req.files; },
  $session: function(obj) { return obj.req.$session; },
  $method: function(obj) { return obj.req.method; },
  $path: function(obj) { return obj.req.path; },
  $body: function(obj) { return obj.req.body; },
  $query: function(obj) { return obj.req.query; },
  $eTagChecksum: function(obj) { return obj.req.eTagChecksum ? obj.req.eTagChecksum : $emptyValue; },
  $cache: cacheEngine.getInjectionFunction(),
  $urlParams: function(obj) { return obj.urlParams ? obj.urlParams : null }, // url variables
  $HttpCacheIndicator: function() { return HttpCacheIndicator },
  $data: function(obj) {
    var data = {};
    _.assign(data, obj.req.query);
    _.assign(data, obj.req.body);
    return data;
  },
  $inject: function(specialObj) {
    // $inject is a special case, it is sent different data in it's obj
    return {
      get: function(param) {
        var value = specialObj.self.getReservedValues(specialObj.request, param, specialObj.circularDependency);
        if(value === $emptyValue) {
          return null;
        } else {
          return value;
        }
      }
    }
  }
};