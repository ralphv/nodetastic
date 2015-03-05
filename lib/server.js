/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

"use strict";

module.exports = function(port, mapper, cb) {
  var expressInfo = require("express/package.json");
  var majorVersion = parseInt(expressInfo.version.substr(0, expressInfo.version.indexOf(".")));
  if(majorVersion <= 3) {
    require("./express3.js")(port, mapper, cb);
  }
  else {
    require("./express.js")(port, mapper, cb);
  }
};
