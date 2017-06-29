/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

var jsonSchemaValidator = require('jsonschema').validate;

// match the proper hungarian notation prefix to a jsonschema
var jsonSchemas = require("./PrefixSchemas.js");

function preProcessStringValue(type, value) {
   if (typeof(value) !== "string")
      return null;
   // some values need processing into different data types, since http sends strings. Abstract here
   if (jsonSchemas[type].type === "number") {
      value = parseInt(value);
      if (isNaN(value)) {
         return {failed: true};
      }
      return {value: value};
   } else if (type === "json" || type === "obj" || type === "arr") {
      try {
         value = JSON.parse(value);
      } catch (err) {
         return {failed: true};
      }
      return {value: value};
   }
   return null;
}

module.exports = function(type, value) {
   if (!jsonSchemas[type])
      throw new Error("Could not find type of parameter \"" + type + "\"");
   var result = preProcessStringValue(type, value);
   if (result && result.failed)
      return result;
   if (result && result.value)
      value = result.value;
   //todo if jsonSchema is overkill for the needs, just do simple type checking, for now leave it
   var validateResult = jsonSchemaValidator(value, jsonSchemas[type]);
   if (validateResult.errors.length > 0)
      return {failed: true};
   return result;
};