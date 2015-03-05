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

ExpiresObject.prototype = {
  processRequest: function($session, request) {
    if (config.disable304Caching)
      return;
    if(request.map.meta && request.map.meta.ExpiresSeconds) {
      request.res.setHeader('date', new Date().toUTCString());
      request.res.setHeader('cache-control', "public, max-age=" + request.map.meta.ExpiresSeconds);
    } else if(request.map.meta && request.map.meta.ExpiresMinutes) {
      request.res.setHeader('date', new Date().toUTCString());
      request.res.setHeader('cache-control', "public, max-age=" + (request.map.meta.ExpiresMinutes * 60));
    }
  },
  __end: 0
}

module.exports = ExpiresObject;