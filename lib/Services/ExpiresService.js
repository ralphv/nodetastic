/**
 * Created by Ralph Varjabedian on 2/27/14.
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
      context.res.setHeader('cache-control', "public, max-age=" + request.map.meta.ExpiresSeconds);
    } else if(context.map.meta && context.map.meta.ExpiresMinutes) {
      context.res.setHeader('date', new Date().toUTCString());
      context.res.setHeader('cache-control', "public, max-age=" + (context.map.meta.ExpiresMinutes * 60));
    }
    cb(result.success());
  },
  __end: 0
};

module.exports = ExpiresObject;