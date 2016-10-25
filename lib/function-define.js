/**
 * Created by Ralph Varjabedian on 10/25/16.
 */

function functionDefine(fn, meta) {
  fn.$meta = meta;
  return fn;
}

$define = functionDefine;
module.exports = functionDefine;