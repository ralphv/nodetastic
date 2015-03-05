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
  var http = require('http');
  var session = require('express-session');
  var bodyParser = require('body-parser');
  var app = express();
  var server = http.createServer(app);

  var sessionMiddleWare = session({
    secret: cookieSecret,
    resave: false,
    saveUninitialized: true
  });

  app.use(sessionMiddleWare);
  try {
    app.use(require("compression")());
  }
  catch(e) {
  }
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

  if(mapper.sessionToSocketIORoomFn) { // set, we want socket.io as well
    require("./SocketIOSupport")(mapper, server, sessionMiddleWare);
  }

  app.all('*', mapper.getRouteRequestFunction());
  app.disable('etag');
  server.listen(port, function() {
    logger.log("Application started using express 4 on port", port);
    if(cb) {
      cb(app);
    }
  });
};