/**
 * Created by Ralph Varjabedian on 10/25/16.
 */

function functionDefine(fn, meta, testCases) {
  if(arguments.length == 1 && typeof(fn) != "function") {
    var fnDef = fn;
    fn = fnDef.fn;
    fn.$meta = fnDef.meta;
    fn.$testCases = fnDef.testCases;
  } else {
    fn.$meta = meta;
    fn.$testCases = testCases;
    return fn;
  }
}

module.exports = functionDefine;
$endPoint = functionDefine;
