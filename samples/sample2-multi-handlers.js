/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
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

mapper.registerHandler("users", {
  add: function($session, strUsername, cb) {  // http://localhost:3333/users/add?strUsername=root
    if (!$session.has("list-users")) {
      $session.set("list-users", []);
    }
    $session.get("list-users").push(strUsername);
    cb();
  },
  list: function($session, cb) {   // http://localhost:3333/users/list
    if (!$session.has("list-users")) {
      $session.set("list-users", []);
    }
    cb(null, $session.get("list-users"));
  }
});
mapper.registerHandler("groups", {
  add: function($session, strGroupname, cb) { // http://localhost:3333/groups/add?strGroupname=group1
    if (!$session.has("list-groups")) {
      $session.set("list-groups", []);
    }
    $session.get("list-groups").push(strGroupname);
    cb();
  },
  list: function($session, cb) {    // http://localhost:3333/groups/list
    if (!$session.has("list-groups")) {
      $session.set("list-groups", []);
    }
    cb(null, $session.get("list-groups"));
  }
});

mapper.startServer(3333);