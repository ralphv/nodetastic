/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

var nodetastic = require("nodetastic");

mapper = nodetastic.CreateNodeTastic();

// 1. access one or more times: http://localhost:3333/dynamic/add?strFunctionName=(new function name)
// 2. to call those dynamically added functions, navigate to: http://localhost:3333/dynamic/(new function name)

var dynamicFunctions = {};
function AddDynamicFunction(name) {
  dynamicFunctions[name] = function($session, cb) {
    if(!$session.has(name)) {
      $session.set(name, 0);
    }
    $session.set(name, $session.get(name) + 1);
    cb(null, "Hello this is dynamic function: " + name + " called: " + $session.get(name) + " times");
  };
}

mapper.registerHandler("dynamic", {
  add: function(strFunctionName, cb) {
    AddDynamicFunction(strFunctionName);
    cb();
  },
  $getFunction: function(data, cb) {
    if(dynamicFunctions[data.functionName]) {
      cb(null, {fn: dynamicFunctions[data.functionName]});
    } else {
      cb();
    }
  }
});

mapper.startServer(3333);