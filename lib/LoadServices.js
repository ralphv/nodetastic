/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

"use strict";

var fs = require('fs');

var additionalServices = {};

(function(dir, subdir) {
  var filesArray = fs.readdirSync(dir + "/" + subdir);
  for(var i = 0; i < filesArray.length; i++) {
    if(filesArray[i].indexOf(".js") === filesArray[i].length - 3) {
      try {
        var module = require("./" + subdir + "/" + filesArray[i]);
        var moduleName = filesArray[i].substring(0, filesArray[i].indexOf(".js"));
        additionalServices[moduleName] = { IsService: true, constructor: module };
      } catch(err) {
      }
    }
  }
})(__dirname, "Services");

module.exports = additionalServices;