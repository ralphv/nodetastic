/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

var http = require("http");
var nodetastic = require("nodetastic");

mapper = nodetastic.CreateNodeTastic();

/*
injectReservedValue always gets context,param as first two parameters, you can request other reserved names after it
if the last parameter is "cb" then this indicates to the engine that the call should be async
*/

// inject reserved word $constants which has the value of pi
mapper.injectReservedValue("$constants", function() {
  return {
    pi: 3.14159
  }
});

// inject reserved word $math which has a set of math functions
mapper.injectReservedValue("$math", function(context, param, $constants) {
  return {
    areaOfCircle: function(radius) {
      return radius * radius * $constants.pi;
    }
  }
});

// inject reserved word $tinyurl which minimizes urls
mapper.injectReservedValue("$tinyurl", function() {
  return {
    shorten: function(url, cb) {
      httpGet("http://tinyurl.com/api-create.php?url=" + url, cb);
    }
  }
});

// inject reserved word $nasa which gets their rss feed in xml, note by adding cb as last parameter, the engine understands that this is async call
mapper.injectReservedValue("$nasa", function(context, param, cb) {
  httpGet("http://www.nasa.gov/rss/dyn/breaking_news.rss", cb);
});

mapper.registerHandler("math", {    // http://localhost:3333/math/areaofcircle?nRadius=5
  areaofcircle: function(nRadius, $math, cb) {
    cb(null, $math.areaOfCircle(nRadius));
  }
});
mapper.registerHandler({
  tinyurl: function(strUrl, $tinyurl, cb) { // http://localhost:3333/tinyurl?strUrl=www.google.com
    $tinyurl.shorten(strUrl, cb);
  },
  nasa: function($nasa, cb) {  // http://localhost:3333/nasa
    cb(null, $nasa);
  }
});

mapper.startServer(3333);

function httpGet(url, cb) {
  http.get(url, function(response) {
    var body = "";
    response.on('data', function(d) {
      body += d;
    });
    response.on('end', function() {
      cb(null, body);
    });
  });
}
