/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

String.prototype.repeat = function(count) {
  var res = "";
  while(count--) res += this;
  return res;
};