/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

var setOptions = require("./cmd_to_config");
module.exports = require("./lib/");
module.exports.setOptions = setOptions;
//set options via command lines or via setOptions