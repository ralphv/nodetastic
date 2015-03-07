/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

var result = require('cb-result');
var config = require('../../config.js');

// simple class to inject Cache-Control header via meta-data
function ExpiresObject() {
  this.IsService = true;
  this.constructor = ExpiresObject;
}

ExpiresObject.AttachedPropertyName = "__expireObject194H";
ExpiresObject.prototype = {
  processRequest: function(context, cb) {
    if (config.disable304Caching)
      return;
    if(context.map.meta && context.map.meta.ExpiresSeconds) {
      context.res.setHeader('date', new Date().toUTCString());
      context.res.setHeader('cache-control', "public, max-age=" + context.map.meta.ExpiresSeconds);
    } else if(context.map.meta && context.map.meta.ExpiresMinutes) {
      context.res.setHeader('date', new Date().toUTCString());
      context.res.setHeader('cache-control', "public, max-age=" + (context.map.meta.ExpiresMinutes * 60));
    }
    cb(result.success());
  },
  __end: 0
};

module.exports = ExpiresObject;