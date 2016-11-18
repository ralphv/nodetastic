/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

var fs = require("fs");
var child_process = require('child_process');

require("./SetupErrorCodes.js");
var config = require("./config.js");
var setOptions = require("./cmd_to_config");
module.exports = require("./lib/");
module.exports.setOptions = setOptions;
//set options via command lines or via setOptions


// setup crash log
process.on('uncaughtException', function(err) {
  console.log('Un-Caught exception:', err);
  var log = function(filename) {
    var details = "";
    try { details = JSON.stringify(err); } catch(e) {}
    const logContents = "uncaught exception: " + (new Date()).toString() + " " + err + " " + details + "\r\n" + "stack: " + err.stack;
    fs.appendFileSync(filename, logContents);
    child_process.execSync("cmd-util chat", {
      input: "nodetastic " + logContents
    });
  };
  try {
    log(config.crashLog);
  }
  catch(e) {
    if(e && e.code == 'EACCES') {
      try { log("./nodetastic-crash.log")} catch(e) {}
    }
  }
  process.exit(1);
});