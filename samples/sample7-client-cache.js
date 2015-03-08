/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

var cb_result = require("cb-result");
var nodetastic = require("nodetastic");

mapper = nodetastic.CreateNodeTastic();

mapper.setTranslateResultFunction(function(result) {
  return {
    success: result.success,
    data: result.data,
    error: result.error ? result.error : undefined,
    errorDetails: result.errorDetails ? result.errorDetails : undefined
  };
});

mapper.registerHandler({
  defaultcash: function($HttpCacheIndicator, cb) {    // http://localhost:3333/defaultcash     (response headers will get: cache-control: public, max-age=XXX)
    cb($HttpCacheIndicator(cb_result.success({data: "default cash time, from httpVerbose in config.js"})));
  },
  cash5minutes: function($HttpCacheIndicator, cb) {    // http://localhost:3333/cash5minutes     (response headers will get: cache-control: public, max-age=300)
    cb($HttpCacheIndicator(cb_result.success({data: "5 minutes cash"}), null, 5 * 60));
  },
  cash_etag: function($HttpCacheIndicator, cb) {    // http://localhost:3333/cash_etag     (response headers will get etag, subsequent calls will get 304 as long as the cash key is the same)
    var cashKey = ["key"];
    cb($HttpCacheIndicator(cb_result.success({data: "cashed with verification using etag based on cashKey"}), cashKey, -1));
  },
  cash_etag_smart: function($HttpCacheIndicator, $eTagChecksum, cb) {    // http://localhost:3333/cash_etag_smart     (response headers will get etag, subsequent calls will get 304 as long as the cash key is the same)
    var cacheKey = ["key", "key1"];
    if($eTagChecksum && global.isChecksumEqual($eTagChecksum, cacheKey)) {
      // smart response, no need to do any business processing here
      // as long as we know that the result will be 304 (same checksum)
      // skipping business processing will benefit performance
      // note how the cb_result.success doesn't have any data, the browser will get it's own copy
      return cb($HttpCacheIndicator(cb_result.success(), cacheKey, -1));
    }
    cb($HttpCacheIndicator(cb_result.success({data: "data"}), cacheKey, -1));
  }
});

mapper.startServer(3333);