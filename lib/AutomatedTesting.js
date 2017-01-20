/**
 * Created by Ralph Varjabedian on 10/27/16.
 */
'use strict';

var request = require("request");
var async = require("async");
var logger = require("../logger.js");
var result = require("cb-result");
var colors = require("colors");

var success = 0;
var failed = 0;
var cookie;

var printFailed = (r) => {
  failed++;
  logger.log(" > TESTING:".cyan + " [" + "FAILED".red + "] with response:", r);
};
var printSuccess = () => {
  success++;
  logger.log(" > TESTING:".cyan + " [" + "SUCCESS".green + "]");
};

function testUrl(baseUrl, port, path, method, testCase, cb) {
  if (!path)
    throw new Error("test case missing path field");
  method = method.toUpperCase();
  var url = baseUrl + ":" + port + path;
  process.stdout.write(" > TESTING: ".cyan);
  if(testCase.description) {
    process.stdout.write("(CASE: " + testCase.description.yellow + ") ");
  }
  process.stdout.write("[" + method.magenta + "] " + url.yellow + " ");
  logger.log("");
  var headers = {"Content-Type": "application/json"};
  if(cookie) {
    headers["cookie"] = cookie;
  }
  request({
    uri: url,
    method: method,
    headers,
    json: method == "GET" ? true : testCase.request,
    qs: method == "GET" ? testCase.request : undefined,
  }, function(err, res, responseData) {
    if(res.headers["set-cookie"]) {
      cookie = res.headers["set-cookie"];
    }
    if(typeof(testCase.response) === "function") {
      // response is a function
      if(!testCase.response(responseData)) {
        printFailed(responseData);
      }
      else {
        printSuccess();
      }
    } else {
      // response is data, just compare it with expected
      if(JSON.stringify(responseData) != JSON.stringify(testCase.response)) {
        printFailed(responseData);
      }
      else {
        printSuccess();
      }
    }
    cb();
  });
}

function flattenAndOrder(urls) {
  var newArray = [];
  for(var i = 0; i < urls.length; i++) {
    if(urls[i].fn.$testCases) {
      for(var t = 0; t < urls[i].fn.$testCases.length; t++) {
        newArray.push({
          path: urls[i].path,
          method: urls[i].method,
          testCase: urls[i].fn.$testCases[t],
          fn: urls[i].fn,
          // pull order out of testCase and use it to sort
          order: typeof(urls[i].fn.$testCases[t].order) != "undefined" ? urls[i].fn.$testCases[t].order : 99999 // default order 99999, which means at end if not defined
        })
      }
    }
  }
  newArray.sort((a, b) => a.order - b.order);
  return newArray;
}

// this is a function part of the Nodetastic prototype
module.exports = function(baseUrl, port, extraTests, cb) {
  // step 1. go over handlers and create a list of urls to test
  let listOfUrls = this.classRegistry.generateUrls();
  var totalUrlsCount = listOfUrls.length;
  listOfUrls = flattenAndOrder(listOfUrls);

  logger.log("\r\n*******************************************************************".cyan);
  logger.log("Starting nodetastic automated testing, found", ("" + totalUrlsCount).green, "URLs to test with", ("" + listOfUrls.length).green, "test cases defined.\r\n");

  async.eachSeries(listOfUrls, function(url, cb) {
    if(url.testCase) {
      testUrl(baseUrl, port, url.path, url.method ? url.method : "post", url.testCase, cb);
    }
    else {
      //console.log("skipping url: " + url.path);
      cb(failed != 0);
    }
  }, result.cb(cb, function() {
    if(extraTests && extraTests.length > 1) {
      async.eachSeries(extraTests, function(test, cb) {
        testUrl(baseUrl, port, test.path, test.method ? test.method : "post", {request: test.request, response: test.response}, cb);
      }, function() {
        logger.log("\r\n*******************************************************************".cyan);
        logger.log("All tests are done".yellow + " SUCCESS: ".green + success + " FAILED: ".red + failed + "  \r\n");
        cb();
      });
    }
    else {
      logger.log("\r\n*******************************************************************".cyan);
      logger.log("All tests are done".yellow + " SUCCESS: ".green + success + " FAILED: ".red + failed + "  \r\n");
      cb(failed != 0);
    }
  }));
};