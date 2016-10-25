/**
 * Created by Ralph Varjabedian on 10/25/16.
 */

function functionDefine(fn, meta) {
  fn.$meta = meta;
  return fn;
}

module.exports = functionDefine;
$endPoint = functionDefine;
