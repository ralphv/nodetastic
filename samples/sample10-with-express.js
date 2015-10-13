/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

var nodetastic = require("nodetastic");
var express = require('express');
var app = express();

var cookieSession = require('cookie-session');
app.use(cookieSession({
  keys: ['secret1', 'secret2']
}));

var mapper = nodetastic.CreateNodeTastic();

app.get('/hello', mapper.wrap(function (cb) {
  cb(null, 'Hello World');
}));

app.get('/helloback', mapper.wrap(function (strName, cb) {
  cb(null, 'Hello World to : ' + strName);
}));

app.get('/sessionset', mapper.wrap(function ($session, data,  cb) {
  $session.set("data", data);
  cb();
}));

app.get('/sessionget', mapper.wrap(function ($session, cb) {
  cb(null, $session.get("data"));
}));

app.listen(3000);
