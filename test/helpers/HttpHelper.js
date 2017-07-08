/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

function HttpHelper(hostname, port, defaultHeaders) {
   this.IsHttpHelper = true;
   this.hostname = hostname;
   if (this.hostname.lastIndexOf("/") === this.hostname.length - 1) {
      this.hostname = this.hostname.substring(0, this.hostname.length - 1);
   }
   this.port = port;
   if (!this.port) {
      this.port = 80;
   }
   this.defaultHeaders = defaultHeaders;
   this.http = require("http");
}

HttpHelper.prototype = {
   createGet: function(path) {
      if (arguments.length > 1) {
         for (var i = 1; i < arguments.length; i++) {
            path += arguments[i];
         }
      }
      var options = {
         IsOptions: true,
         ref: this,
         hostname: this.hostname,
         port: this.port,
         path: path,
         method: "GET",
         headers: JSON.parse(JSON.stringify(this.defaultHeaders))
      };
      this.copyFunctionsToo(options);
      return options;
   },
   get: function(params, cb) {
      if (arguments.length === 1)
         cb = params;
      var self = this;
      var options = self;
      if (self.IsOptions) {
         self = self.ref;
      } else {
         throw new Error("must use function createGet/createPost first");
      }
      if (params)
         options.path += "?" + self.getGetParams(params);
      self.http.request(options, function(res) {
         res.fullBody = "";
         res.setEncoding('utf8');
         res.on("data", function(chunk) {
            res.fullBody += chunk;
         });
         res.on("end", function() {
            cb(null, res.fullBody, res);
         });
         res.on("error", function(e) {
            cb(e);
         })
      }).end();
   },
   getJson: function(params, cb) {
      if (arguments.length === 1) {
         cb = params;
         params = null;
      }
      this.get(params, function(err, data, res) {
         if (err) {
            cb(err);
         } else {
            cb(err, JSON.parse(data), res);
         }
      })
   },
   createPost: function(path) {
      var options = {
         IsOptions: true,
         ref: this,
         hostname: this.hostname,
         port: this.port,
         path: path,
         method: "POST",
         headers: JSON.parse(JSON.stringify(this.defaultHeaders))
      };
      this.copyFunctionsToo(options);
      return options;
   },
   getGetParams: function(paramsObject) {
      var bodyStr = "";
      for (var k in paramsObject) {
         if (bodyStr !== "")
            bodyStr += "&";
         if (typeof(paramsObject[k]) === "object")
            paramsObject[k] = JSON.stringify(paramsObject[k]);
         bodyStr += (k + "=" + encodeURI(paramsObject[k]));
      }
      return bodyStr;
   },
   post: function(postData, cb) {
      var self = this;
      var options = self;
      if (self.IsOptions) {
         self = self.ref;
      } else {
         throw new Error("must use function createPost first");
      }
      var postReq = self.http.request(options, function(res) {
         res.fullBody = "";
         res.setEncoding('utf8');
         res.on("data", function(chunk) {
            res.fullBody += chunk;
         });
         res.on("end", function() {
            cb(null, res.fullBody, res);
         });
         res.on("error", function(e) {
            cb(e);
         })
      });
      if (typeof(postData) === "object")
         postData = JSON.stringify(postData);
      postReq.write(postData);
      postReq.end();
   },
   postJson: function(postData, cb) {
      this.post(postData, function(err, data, res) {
         if (err) {
            cb(err);
         } else {
            cb(err, JSON.parse(data), res);
         }
      })
   },
   modifyHeader: function(headerName, value) {
      this.removeHeader(headerName);
      return this.addHeader(headerName, value);
   },
   removeHeader: function(headerName) {
      var self = this;
      var options = self;
      if (self.IsOptions) {
         self = self.ref;
      } else {
         throw new Error("must use function createGet/createPost first");
      }
      delete options.headers[headerName];
      return options;
   },
   addHeader: function(headerName, value) {
      var self = this;
      var options = self;
      if (self.IsOptions) {
         self = self.ref;
      } else {
         throw new Error("must use function createGet/createPost first");
      }
      options.headers[headerName] = value;
      return options;
   },
   setMethod: function(method) {
      var self = this;
      var options = self;
      if (self.IsOptions) {
         self = self.ref;
      } else {
         throw new Error("must use function createGet/createPost first");
      }
      options.method = method;
      return options;
   },
   /* private */
   copyFunctionsToo: function(options) {
      for (var e in HttpHelper.prototype) {
         var func = HttpHelper.prototype[e];
         if (typeof(func) === "function") {
            options[e] = func;
         }
      }
   },
   __end: 0
};

module.exports = HttpHelper;