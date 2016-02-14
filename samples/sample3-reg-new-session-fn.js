/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
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

mapper.registerNewSessionFunction(function($inject, cb) {
  $inject.get("$session", cb_result.cb(cb, function($session) {
    // initialize each new session with two users already
    $session.set("list-users", ["root", "user"]);
    cb();
  }));
});

mapper.registerHandler("users", {
  add: function($session, strUsername, cb) {  // http://localhost:3333/users/add?strUsername=newuser
    if(!$session.has("list-users")) {
      $session.set("list-users", []);
    }
    $session.get("list-users").push(strUsername);
    cb();
  },
  list: function($session, cb) {   // http://localhost:3333/users/list
    if(!$session.has("list-users")) {
      $session.set("list-users", []);
    }
    cb(null, $session.get("list-users"));
  }
});

mapper.startServer(3333);