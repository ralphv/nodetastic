/**
 * Created by Ralph Varjabedian on 2/14/14.
 */

var crypto = require('crypto');
var httpCache = require('../config.js').httpCache;

function HttpCacheIndicator(object, checksum, overrideSeconds) {
  object.cache = {};
  if(overrideSeconds) {
    object.cache.seconds = overrideSeconds;
  } else {
    object.cache.seconds = httpCache;
  }
  if(checksum) {
    object.cache.checksum = HttpCacheIndicator.checksum(checksum);
  }
  return object;
}

HttpCacheIndicator.checksum = function(checksum) {
  // hash to possibly prevent sensitive data on the client side.
  checksum = Array.isArray(checksum) ? checksum.join("&") : checksum;
  var shasum = crypto.createHash('sha1');
  shasum.update(checksum);
  return shasum.digest('base64');
};

HttpCacheIndicator.isChecksumEqual = function(checksum, etag) {
  return etag === HttpCacheIndicator.checksum(checksum);
};

module.exports = HttpCacheIndicator;
global.isChecksumEqual = HttpCacheIndicator.isChecksumEqual;
