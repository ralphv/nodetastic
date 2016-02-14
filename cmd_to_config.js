/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

/**
 * Created by Ralph Varjabedian on 3/31/14.
 * v 1.07
 *
 * A generic file that reads command line arguments and matches them against values in ./config.js
 * If something is found there, it will be modified according to it's proper type
 *
 * Just copy it to the project that has ./config.js
 * pass on the command line ref=value
 * you can pass composite references like a.b.c=value
 * for strings with spaces, the command line will be: "ref=this is the new string value"
 *
 */

var assert = require("assert");
var config = require("./config.js");
var _ = require("lodash");
var logger = logger = {info: console.log};
try { logger = require("do.logger"); } catch(err) {}

var projectName = __dirname.substring(__dirname.lastIndexOf("/") + 1);
logger.info("cmd_to_config: scanning command line arguments for ./config.js matches for project: " + projectName);
process.argv.forEach(function(val) {
  var parts = val.split('=');
  if(parts && parts.length === 2) {
    var configElementRef = parts[0];
    var configElementValue = parts[1];
    var composite = false;
    var compositePartsObj;
    var compositePartsRef;
    if(configElementRef.indexOf(".") !== -1) { // composite, contains .
      var objectParts = configElementRef.split(".");
      var ptr = config;
      for(var i = 0; i < objectParts.length - 1; i++) {
        if(ptr && ptr.hasOwnProperty(objectParts[i])) {
          ptr = ptr[objectParts[i]];
        } else {
          break;
        }
      }
      if(ptr && ptr.hasOwnProperty(objectParts[objectParts.length - 1])) {
        compositePartsRef = objectParts[objectParts.length - 1];
        compositePartsObj = ptr;
        configElementRef = configElementRef.replace(/\./g, '_');
        config[configElementRef] = compositePartsObj[compositePartsRef];
        composite = true;
      }
    }
    if(config.hasOwnProperty(configElementRef)) {
      if(Array.isArray(config[configElementRef])) {
        if(configElementValue.indexOf("[") !== -1) { // written in full array format
          config[configElementRef] = JSON.parse(configElementValue);
          assert(Array.isArray(config[configElementRef]), "expected to parse value into array");
        } else { // written using comma only, assume array of strings
          config[configElementRef] = configElementValue.split(",");
        }
        logger.info("cmd_to_config: [" + parts[0] + "=" + JSON.stringify(config[configElementRef]) + "] (array)");
      } else if(typeof(config[configElementRef]) === "boolean") {
        if(configElementValue === "true" || configElementValue === "false") {
          config[configElementRef] = (configElementValue === "true");
          logger.info("cmd_to_config: [" + parts[0] + "=" + config[configElementRef] + "] (boolean)");
        }
      } else if(typeof(config[configElementRef]) === "number") {
        try {
          config[configElementRef] = parseInt(configElementValue);
          logger.info("cmd_to_config: [" + parts[0] + "=" + config[configElementRef] + "] (integer)");
        } catch(err) {
        }
      } else {
        config[configElementRef] = configElementValue;
        logger.info("cmd_to_config: [" + parts[0] + "=" + config[configElementRef] + "] (string)");
      }
    }
    if(composite) {
      compositePartsObj[compositePartsRef] = config[configElementRef];
      delete config[configElementRef];
    }
  }
});
logger.info("cmd_to_config: done scanning for: " + projectName);

module.exports = function(opt) {
  logger.info("cmd_to_config: setting options", JSON.stringify(opt));
  _.merge(config, opt);
};
