/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

var nodetastic = require("nodetastic");

mapper = nodetastic.CreateNodeTastic();

mapper.registerHandler("users", {
  add: function($cache$30, strUsername, cb) {  // http://localhost:3333/users/add?strUsername=newuser
    if(!$cache$30.has("list-users")) {
      $cache$30.set("list-users", []);
    }
    $cache$30.get("list-users").push(strUsername);
    cb();
  },
  list: function($cache$30, cb) {   // http://localhost:3333/users/list
    if(!$cache$30.has("list-users")) {
      $cache$30.set("list-users", []);
    }
    cb(null, $cache$30.get("list-users"));
  }
});

mapper.startServer(3333);