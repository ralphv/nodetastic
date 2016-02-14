/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

var moduleName = require("./package.json").name;
function log(name) {
   return function() {
      console[name].apply(this, ["\033[1;34m[" + moduleName + "]\033[0m"].concat(Array.prototype.slice.call(arguments, 0)));
   }
}

var consoleLogger = {
   fatal: log("error"),
   error: log("error"),
   warn: log("warn"),
   info: log("info"),
   debug: log("log"),
   log: log("log")
};

module.exports = consoleLogger;

try {
   module.exports = require('do.logger');
}
catch (err) {
}



