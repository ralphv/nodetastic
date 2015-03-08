/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

'use strict';

var lruCache = require("lru-cache");
var logger = require('../logger.js');
var cacheMaxItems = require('../config.js').cacheMaxItems;
var cacheMaxPoolSize = require('../config.js').cacheMaxPoolSize;

//<editor-fold defaultstate="collapsed" desc="built in server side cache service">
function Cache(minutes) {
  this.cache = lruCache({max: cacheEngine.cacheMaxItems, maxAge: minutes * (1000 * 60)});
}
Cache.prototype = {
  getWrapper: function(seed) {
    return new CacheWrapper(this, seed);
  }
};
function CacheWrapper(cache, seed) {
  this.cache = cache.cache;
  this.getSeed = function() { return seed; }
}
CacheWrapper.prototype = {
  set: function(key, value) {
    return this.cache.set(this.key(key), value);
  },
  get: function(key) {
    return this.cache.get(this.key(key));
  },
  has: function(key) {
    return this.cache.has(this.key(key));
  },
  key: function(key) {
    if(Array.isArray(key)) {
      return this.getSeed() + "_" + key.join("&");
    } else {
      return this.getSeed() + key;
    }
  }
};
var cacheEngine = {
  cacheMaxItems: cacheMaxItems,
  poolSize: cacheMaxPoolSize,
  poolArray: [],
  poolHash: {},
  getInjectionFunction: function() {
    var self = this;
    return function(context, param) { return self.getCache(context.req, param, context.className); }
  },
  getCache: function(req, param, className) {
    var metaDataIndex = param.indexOf('$', 1);
    var metaData = param.substring(metaDataIndex + 1);
    if (metaDataIndex == -1) {
        metaData = 30; // default 30 minutes
    }
    return this.getCacheOf(parseInt(metaData)).getWrapper(className);
  },
  getCacheOf: function(minutes) {
    if(this.poolHash["_" + minutes]) {
      return this.poolHash["_" + minutes];
    } else {
      if(this.poolArray.length >= this.poolSize) {
        logger.error("DynamicHttpLayer Pool limit reached");
        return null;
      }
      var newCache = new Cache(minutes);
      this.poolHash["_" + minutes] = newCache;
      this.poolArray.push(newCache);
      return newCache;
    }
  }
};
//</editor-fold>

module.exports = cacheEngine;
