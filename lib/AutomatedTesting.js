/**
 * Created by Ralph Varjabedian on 10/27/16.
 */
'use strict';

var request = require("request");
var async = require("async");

function testUrl(path, method, testCase, cb) {
  debugger;
  request({
    uri: "http://127.0.0.1:3333" + path,
    method: method,
    headers: {"Content-Type": "application/json"},
    json: testCase.request
  }, function(err, res, responseData) {
    if(JSON.stringify(responseData) != JSON.stringify(testCase.response)) {
      console.log("invalid response from test case");
    }
    else {
      console.log("success");
    }
    cb();
  });
}

// this is a function part of the Nodetastic prototype
module.exports = function(cb) {
  // step 1. go over handlers and create a list of urls to test
  const listOfUrls = this.classRegistry.generateUrls();

  async.eachSeries(listOfUrls, function(url, cb) {
    if(url.fn.$testCases) {
      for(let t = 0; t < url.fn.$testCases.length; t++) {
        testUrl(url.path, url.method ? url.method : "post", url.fn.$testCases[t], cb);
      }
    } else {
      console.log("skipping url: " + url.path);
      cb();
    }
  }, cb);
};