/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

var result = require('cb-result');
var config = require('../../config.js');

// simple class to inject Cache-Control header via meta-data
function ExpiresObject() {
  this.IsService = true;
}

ExpiresObject.AttachedPropertyName = "__expireObject194H";
ExpiresObject.prototype = {
  processRequest: function(context, cb) {
    if (config.disable304Caching)
      return;
    if(context.meta && context.meta.ExpiresSeconds) {
      context.res.setHeader('date', new Date().toUTCString());
      context.res.setHeader('cache-control', "public, max-age=" + context.meta.ExpiresSeconds);
    } else if(context.meta && context.meta.ExpiresMinutes) {
      context.res.setHeader('date', new Date().toUTCString());
      context.res.setHeader('cache-control', "public, max-age=" + (context.meta.ExpiresMinutes * 60));
    }
    cb(result.success());
  },
  __end: 0
};

module.exports = ExpiresObject;