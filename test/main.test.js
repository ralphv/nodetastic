'use strict';

var should = require('should');
var path = require('path');
var port = 4444;

describe('testing nodetastic', function() {
  this.timeout(0);

  it('testing require and hook', function(done) {
    var nodetastic = require("../");
    var mapper = nodetastic.CreateNodeTastic();
    mapper.startServer(port);
    done();
  });

});

