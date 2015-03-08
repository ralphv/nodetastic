/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

var nodetastic = require("nodetastic");

mapper = nodetastic.CreateNodeTastic();

// result is of the format of cb-result
// before returning back data to client, you get the chance to modify it as you need
mapper.setTranslateResultFunction(function(result) {
  return {
    success: result.success,
    data: result.data,
    error: result.error ? result.error : undefined,
    errorDetails: result.errorDetails ? result.errorDetails : undefined
  };
});

mapper.registerHandler({
  HelloNodeTastic: function(cb) {     // http://localhost:3333/HelloNodeTastic
    cb(null, "Hello NodeTastic!");
  },
  HelloBack: function(strName, cb) {    // http://localhost:3333/HelloBack?strName=Myself
    cb(null, "Hello " + strName + "!");
  },
  session: {
    set : function($session, objData, cb) { // http://localhost:3333/session/set?objData={%22key%22:%22value%22}
      $session.set("data", objData);
      cb();
    },
    get: function($session, cb) {   // http://localhost:3333/session/get
      cb(null, $session.get("data"));
    }
  }
});

mapper.startServer(3333);