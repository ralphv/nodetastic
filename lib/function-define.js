/**
 * Created by Ralph Varjabedian on 10/25/16.
 */

function functionDefine(fn, meta, testCases) {
  fn.$meta = meta;
  fn.$testCases = testCases;
  return fn;
}

module.exports = functionDefine;
$endPoint = functionDefine;
