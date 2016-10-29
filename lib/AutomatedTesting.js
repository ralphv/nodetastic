/**
 * Created by Ralph Varjabedian on 10/27/16.
 */
'use strict';

var request = require("request");
var async = require("async");
var logger = require("../logger.js");
var result = require("cb-result");
var colors = require("colors");

var printFailed = () => logger.log("[" + "FAILED".red + "]");
var printSuccess = () => logger.log("[" + "SUCCESS".green + "]");

function testUrl(baseUrl, port, path, method, testCase, cb) {
  var url = baseUrl + ":" + port + path;
  process.stdout.write(" > TESTING: ".cyan);
  if (testCase.description) {
    process.stdout.write("(CASE: " + testCase.description.yellow + ") ");
  }
  process.stdout.write("[" + method.toUpperCase().magenta + "] " + url.yellow + " ");
  request({
    uri: url,
    method: method,
    headers: {"Content-Type": "application/json"},
    json: testCase.request
  }, function(err, res, responseData) {
    debugger;
    if(typeof(testCase.response) == "function") {
      // response is a function
      if(!testCase.response(responseData)) {
        printFailed();
      }
      else {
        printSuccess();
      }
    } else {
      // response is data, just compare it with expected
      if(JSON.stringify(responseData) != JSON.stringify(testCase.response)) {
        printFailed();
      }
      else {
        printSuccess();
      }
    }
    cb();
  });
}

// this is a function part of the Nodetastic prototype
module.exports = function(baseUrl, port, extraTests, cb) {
  // step 1. go over handlers and create a list of urls to test
  const listOfUrls = this.classRegistry.generateUrls();
  let testCasesCount = 0;
  for (let i = 0; i < listOfUrls.length; i++) { testCasesCount += listOfUrls[i].fn.$testCases ? 1 : 0; }

  logger.log("\r\n*******************************************************************".cyan);
  logger.log("Starting nodetastic automated testing, found", ("" + listOfUrls.length).green, "URLs to test with", ("" + testCasesCount).green, "test cases defined.\r\n");

  async.eachSeries(listOfUrls, function(url, cb) {
    async.eachSeries(url.fn.$testCases, function(testCase, cb) {
      if(url.fn.$testCases) {
        testUrl(baseUrl, port, url.path, url.method ? url.method : "post", testCase, cb);
      }
      else {
        //console.log("skipping url: " + url.path);
        cb();
      }
    }, cb);
  }, result.cb(cb, function() {
    if (extraTests && extraTests.length > 1) {
      async.eachSeries(extraTests, function(test, cb) {
        testUrl(baseUrl, port, test.url, test.method, {request: test.request, response: test.response}, cb);
      }, function() {
        logger.log("\r\n*******************************************************************".cyan);
        logger.log("All tests are done".yellow + "\r\n");
        cb();
      });
    }
    else {
      logger.log("\r\n*******************************************************************".cyan);
      logger.log("All tests are done".yellow + "\r\n");
      cb();
    }
  }));
};