/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
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
  checksum = Array.isArray(checksum) ? checksum : [checksum];
  for(var i = 0; i < checksum.length; i++) {
    if(typeof(checksum[i]) != "string") {
      checksum[i] = JSON.stringify(checksum[i]);
    }
  }
  var shasum = crypto.createHash('sha1');
  shasum.update(checksum.join("&"));
  return shasum.digest('base64');
};

HttpCacheIndicator.isChecksumEqual = function(checksum, etag) {
  return etag === HttpCacheIndicator.checksum(checksum);
};

module.exports = HttpCacheIndicator;
global.isChecksumEqual = HttpCacheIndicator.isChecksumEqual;
