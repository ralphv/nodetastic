/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

var fs = require("fs");

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
    fs.appendFileSync(filename, "uncaught exception: " + (new Date()).toString() + " " + err + " " + details + "\r\n");
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