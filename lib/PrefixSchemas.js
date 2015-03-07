/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

module.exports = {
   /* number */
   "n": {
      "type": "number"
   },
   /* non zero number */
   "nzn": {
      "type": "number",
      "minimum": 1
   },
   "str": {
      "type": "string"
   },
   "json": {
      "type": "object"
   },
   "obj": {
      "type": "object"
   },
   "arr": {
      "type": "array"
   }
};
