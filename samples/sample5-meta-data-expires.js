/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

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

// attach the global service ExpiresService
mapper.attachGlobalService(mapper.Services.ExpiresService);

mapper.registerHandler({
  cache60minutes: function(cb) {    // http://localhost:3333/cache60minutes     (response headers will get: cache-control: public, max-age=3600)
    //<meta>{"ExpiresMinutes":60}</meta>
    cb(null, {data: "data 60 minutes"});
  },
  cache60seconds: function(cb) {    // http://localhost:3333/cache60seconds     (response headers will get: cache-control: public, max-age=60)
    //<meta>{"ExpiresSeconds":60}</meta>
    cb(null, {data: "data 60 seconds"});
  }
});

mapper.startServer(3333);