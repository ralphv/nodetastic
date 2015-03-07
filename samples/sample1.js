/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

var nodetastic = require("./../index");

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
  HelloNodeTastic: function(cb) {
    cb(null, "Hello NodeTastic!");
  },
  HelloBack: function(strName, cb) {
    cb(null, "Hello " + strName + "!");
  },
  session: {
    set : function($session, objData, cb) {
      $session.set("data", objData);
      cb();
    },
    get: function($session, cb) {
      cb(null, $session.get("data"));
    }
  }
});

mapper.startServer(3333);