/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

"use strict";

var logger = require("../logger.js");

module.exports = function(port, mapper, cb) {
  var cookieSecret = require("../config.js").cookieSecret;
  var cookieMaxAgeMinutes = require("../config.js").cookieMaxAgeMinutes;

  var express = require('express');
  var app = express();
  if(express.compress) {
    app.use(express.compress());
  }
  app.use(express.cookieParser());
  app.use(express.session({
    secret: cookieSecret, cookie: {
      expires: new Date(Date.now() + (cookieMaxAgeMinutes * (60 * 1000))),
      maxAge: cookieMaxAgeMinutes * (60 * 1000)
    }
  }));
  app.use(express.bodyParser());
  app.all('*', mapper.getRouteRequestFunction());
  mapper.close = function(cb) {
    app.close(cb);
  };
  app.disable('etag');
  app.listen(port, function() {
    logger.log("Application started using express 3 on port", port);
    if (cb) {
      cb(app);
    }
  });
};
