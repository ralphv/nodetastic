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

// attach the global service StateService and pass it setup options
mapper.attachGlobalService(mapper.Services.StateService, {
  states: ["loggedIn", "loggedOut"], // two states are defined
  valid: {"loggedIn": ["loggedOut"], "loggedOut": ["loggedIn"]},  // valid jumps between states, from loggedIn->loggedOut, loggedOut->loggedIn
  start: "loggedOut", // initial state in a new session
  defaultMeta: "loggedIn" // no meta data on functions = functions allowed only in: loggedIn
});

mapper.registerHandler("access", {
  login: function($state, cb) {   // http://localhost:3333/access/login   (Only allowed if loggedOut)
    //<meta>{"StateService":"loggedOut"}</meta>
    $state.set("loggedIn");
    cb();
  },
  islogin: function($state, cb) {   // http://localhost:3333/access/islogin
    //<meta>{"StateService":"any"}</meta>
    cb(null, $state.get());
  },
  logout: function($state, $session, cb) {    // http://localhost:3333/access/logout    (Only allowed if loggedIn)
    //<meta>{"StateService":"loggedIn"}</meta>
    $state.set("loggedOut");
    $session.destroy();
    cb();
  }
});

mapper.registerHandler("data", {
  getdate: function($state, cb) {   // http://localhost:3333/data/getdate   (Only allowed if loggedIn)
    cb(null, new Date());
  },
  getdatepublic: function($state, cb) {   // http://localhost:3333/data/getdate   (allowed if loggedIn or loggedOut)
    //<meta>{"StateService":"any"}</meta>
    cb(null, new Date());
  }
});

mapper.startServer(3333);