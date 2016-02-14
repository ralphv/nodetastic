/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

"use strict";

function CircularDependency(param, parent) {
  this.parent = parent;
  this.param = param;
}

CircularDependency.prototype = {
  detect: function(param) {
    if(this.parent) {
      var node = this.parent;
      var keys = [];
      while(node) {
        keys.push(node.param);
        if(node.param === param) {
          keys = keys.reverse();
          keys.push(param);
          throw new Error("Circular dependency detected in reserved words for DynamicHttpLayer: " + keys.join(" > "));
        }
        node = node.parent;
      }
    }
  }
};

module.exports = CircularDependency;