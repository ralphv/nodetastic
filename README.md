# nodetastic - A dependency injection http server with a twist, built on top of express

[![NPM](https://nodei.co/npm/nodetastic.png?mini=true)](https://nodei.co/npm/nodetastic/)

* [Features](#features)
* [Getting started](#getting-started)
* [Samples](#samples)
* [API](#api)
* [Reserved words](#reserved-words)
* [The command line](#the-command-line)
* [License](#license)
* [Changelog](#change-log)

<a name="features" />
## Features

* A web server with a dependency injection engine.
* Advanced meta-data per function (Attributes in C#/Annotations in JAVA) via specially formatted embedded comments.
* Parameters of functions are either reserved words (services) or GET/POST parameters.
* Basic GET/POST parameters are automatically checked and can be type checked as well via hungarian notation.
* Path is deduced from the nesting structure of handlers.
* If you are familiar with AngularJS, you will feel right at home.
* In theory your code can be used by multiple transport layers (other than http) because of the abstraction provided.
* Support for client side caching (304) and server side cashing.
* Support for integrated socket.io handling.
* Support for side loading services that have access to meta-data and can control the flow of requests/responses.
* Built on top of express, it will automatically detect express 3 vs express 4.
* Built in server or integrate with your own setup.

<a name="getting-started" />
## Getting started

    $ npm install -g nodetastic

Simple example:

```javascript
var nodetastic = require("nodetastic");

mapper = nodetastic.CreateNodeTastic();

mapper.registerHandler({
  HelloNodeTastic: function(cb) {
    cb(null, "Hello NodeTastic!");
  },
  HelloBack: function(strName, cb) {
    cb(null, "Hello " + strName + "!");
  },
  session: {
    set : function($session, objData, cb) {
      $session.set("data", objData);
      cb();
    },
    get: function($session, cb) {
      cb(null, $session.get("data"));
    }
  }
});

mapper.startServer(80);
```

<a name="samples" />
## Samples

* [Sample1](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample1.js)
Basic sample (getting started).

* [Sample2: multiple handlers](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample2-multi-handlers.js)
Register multiple handlers with different prefixes.

* [Sample3: new session initializer](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample3-reg-new-session-fn.js)
Register new session function that gets called on new sessions, get a chance to initialize code as you need.

* [Sample4: states, loggedIn, loggedOut and access control](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample4-states-login-logout.js)
Make use of the service "StateService", define two basic states. Control access to APIs based on current state.

* [Sample5: make use of meta-data for simple cash control](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample5-meta-data-expires.js)
Make use of the meta-data feature in nodetastic, use the service "ExpiresService" to provide simple cash control.

* [Sample6: inject your own reserved words](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample6-custom-reserved-words.js)
See how easy it is to add your own set of reserved words and consume them easily in your functions.
The best of dependency injection at work.

* [Sample7: control client side cash (304)](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample7-client-cache.js)
Multiple levels of cash control.

<a name="api" />
## API

<a name="set-options" />
### setOptions(config)

Change the options of nodetastic.
The parameters are those of [./config.js](http://bitbucket.org/ralphv/nodetastic/src/master/config.js).

__Arguments__

* `config` - The configuration object.

__Examples__

```js
var nodetastic = require("nodetastic");

// set own cookieSecret and change the http verbose level to 2
nodetastic.setOptions({cookieSecret:"new-secret", httpVerbose:2});
```

<a name="create-node-tastic" />
### CreateNodeTastic()

Create an instance of nodetastic.

__Examples__

[Sample1](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample1.js)

<a name="register-handler" />
### registerHandler([prefix], handler)

Register an object as a handler for a certain url prefix or for the top level (without prefix).
Nodetastic resolves paths differently. It deduces the path relative to the object's properties.
Each sub-object is a url path part and each function is an endpoint.

__Arguments__

* `[prefix]` - Optional prefix.
* `handler` - An object containing nested objects and functions.

__Examples__

[Sample2: multiple handlers](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample2-multi-handlers.js)

<a name="start-server" />
### startServer(port, [callback])

Start express server on the given port.
Express 3 vs 4 will be automatically detected.

__Arguments__

* `port` - Port number.
* `[callback]` - An optional callback handler that will be called when the server starts.

__Examples__

[Sample1](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample1.js)

<a name="set-translate-result-function" />
### setTranslateResultFunction(fn)

Sets a translation function. This function will be called to translate between cb-result and between the actual object that will be returned as JSON over http.

__Arguments__

* `fn(result)` - Takes in the result object and returns the desired translated object.

__Examples__

[Sample1](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample1.js)

<a name="inject-reserved-value" />
### injectReservedValue(reservedValueName, fn)

Creates a custom reserved value that you "require" in your handler functions.
The `fn` will be called whenever the reserved value is required by a handler function.
The parameters of fn should always start with two variables, `context` and `param`.
The `fn` can depend on other reserved words as long as they don't have a circular dependency.
If you specify the last parameter as `cb` then this is an indicator that `fn` is to be called in async mode.

__Arguments__

* `reservedValueName` - The reserved value name. Should always start with a $ sign.
* `fn` the function that will provide the reserved value.

__Examples__

[Sample6: inject your own reserved words](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample6-custom-reserved-words.js)

<a name="set-global-prefix" />
### setGlobalPrefix(prefix)

Sometimes it is useful to have a global prefix added to all handlers, this is usually in environments behind a reverse proxy.

__Arguments__

* `prefix` - The prefix to use

<a name="setup-socket-io" />
### setupSocketIO()
__Arguments__
__Examples__

<a name="set-temporary-halt" />
### setTemporaryHalt()
__Arguments__
__Examples__

<a name="remove-temporary-halt" />
### removeTemporaryHalt()
__Arguments__
__Examples__

<a name="register-new-session-function" />
### registerNewSessionFunction()
__Arguments__
__Examples__

<a name="attach-global-service" />
### attachGlobalService()
__Arguments__
__Examples__

<a name="attach-service" />
### attachService()
__Arguments__
__Examples__

<a name="get-route-request-function" />
### getRouteRequestFunction()
__Arguments__
__Examples__

<a name="authorize-function" />
### $authorizeFunction()
__Arguments__
__Examples__

<a name="get-function" />
### $getFunction()
__Arguments__
__Examples__

<a name="reserved-words" />
## Reserved words

You can add your own reserved words (values) via the api function [injectReservedValue](#inject-reserved-value).
Reserved words always start with a $ sign, otherwise it will be a GET/POST parameter.
The set of built in reserved words:

    $session: An object that provides access to session variables via setters/getters
    $eTagChecksum: The passed etag that the client passes with the request
    $cache$[XX]: Access to server side cache, the XX is the number of minutes. (ex: $cache$15, $cache$30)
    $files: Access to uploaded files
    $data: GET/POST data for those parameters that are not always mandatory
    $urlParams: Data embedded in path parameters by preceding the path part with a $ sign ex: /path/$param1/get
    $HttpCacheIndicator: A helper class for controlling client side caching (304)
    $inject: Provides access to other reserved words
    $socket: emit data to socket.io (only supported with express4 + socket.io integration)

The following reserved words are also available but it is recommended not to use them.
They will bind your code with http related concepts and break the abstraction.

    $path: The path of the http request
    $request: The req object
    $response: The res object
    $method: The method of the http request
    $body: Data passed through (POST) parameters
    $query: Data passed through query parameters (GET)

<a name="the-command-line" />
## The command line

The command line arguments you pass serve the purpose of modifying one or more configuration properties found in [./config.js](http://bitbucket.org/ralphv/nodetastic/src/master/config.js).
The format of the arguments is in the form of X=Y, check the next samples.
You could also modify options via setOptions function.

    $ node (your project) param=value
    $ node (your project) 'param=value with spaces'
    $ node (your project) 'array_param=["array element 1", "array element 2"]'
    $ node (your project) array_param=element_one,element_two,element_three

<a name="license" />
## License

nodetastic is licensed under the [BSD-3 License](http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE).

<a name="change-log" />
## Changelog

* 0.1.2: APIs documentation added.

* 0.1.1: Samples added.

* 0.1.0: Initial version.