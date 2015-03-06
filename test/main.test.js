'use strict';

var should = require('should');
var assert = require('assert');
var path = require('path');
var port = 4444;

var HttpHelper = require('./helpers/HttpHelper');
var httpHelper = new HttpHelper("localhost", port, {
  'accept': "application/json",
  'content-type': "application/json",
  'origin': 'unit-tests'
});

describe('testing nodetastic', function() {
  this.timeout(0);

  it('testing start server', function(done) {
    var nodetastic = require("../");
    var mapper = nodetastic.CreateNodeTastic();
    mapper.registerHandler("", {
      hello: function(cb) {
        cb(null, "hello world");
      }
    });
    mapper.startServer(port, function() {
      done();
    });
  });

  it('testing ping', function(done) {
    httpHelper.createGet("/ping").getJson(function(err, result) {
      assert(result.date);
      done();
    });
  });

  it('testing hello', function(done) {
    httpHelper.createGet("/hello").getJson(function(err, result) {
      console.log(result);
      assert(result.data == "hello world");
      done();
    });
  });
});

