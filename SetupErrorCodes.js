/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

var errors = require("cb-result").errors;

/* code, enm, desc, regex */
errors.add({code: 400, enum: "missingParameter", desc: "missing parameter", ext: {httpCode: 400}});
errors.add({code: 401, enum: "invalidParameterType", desc: "invalid parameter type", ext: {httpCode: 400}});
errors.add({code: 402, enum: "invalidState", desc: "invalid state for function", ext: {httpCode: 403}});
errors.add({code: 403, enum: "notAuthorizedPath", desc: "unauthorized url/function", ext: {httpCode: 403}});
errors.add({code: 404, enum: "invalidPath", desc: "invalid url/function", ext: {httpCode: 400}});
