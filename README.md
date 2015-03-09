# nodetastic - A dependency injection http server with a twist, built on top of express

[![NPM](https://nodei.co/npm/nodetastic.png?mini=true)](https://nodei.co/npm/nodetastic/)

* [Features](#features)
* [Getting started](#getting-started)
* [Samples](#samples)
* [The command line](#the-command-line)
* [Reserved Values](#reserved-values)
* [API](#api)
* [License](#license)
* [Changelog](#changelog)

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

mapper.setTranslateResultFunction(function(result) {
  return {
    success: result.success,
    data: result.data,
    error: result.error ? result.error : undefined,
    errorDetails: result.errorDetails ? result.errorDetails : undefined
  };
});

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

mapper.startServer(3333);
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

<a name="the-command-line" />
## The command line

The command line arguments you pass serve the purpose of modifying one or more configuration properties found in [./config.js](http://bitbucket.org/ralphv/nodetastic/src/master/config.js).
The format of the arguments is in the form of X=Y, check the next samples.
You could also modify options via setOptions function.

    $ node (your project) param=value
    $ node (your project) 'param=value with spaces'
    $ node (your project) 'array_param=["array element 1", "array element 2"]'
    $ node (your project) array_param=element_one,element_two,element_three

<a name="reserved-values" />
## Reserved values

You can add your own reserved values (i.e. factory in AngularJS) via the api function injectReservedValue.
Reserved words always start with $sign, otherwise it will be a GET/POST parameter.
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

<a name="API" />
## API

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

### CreateNodeTastic()

Create an instance of nodetastic.

__Examples__

```js
var nodetastic = require("nodetastic");

var nt = nodetastic.CreateNodeTastic();
```

### registerHandler([prefix], handler)

Register an object as a handler for a certain url prefix or for the top level (without prefix).
Nodetastic resolves paths differently. It deduces the path relative to the object's properties.
Each sub-object is a url path part and each function is an endpoint.

__Arguments__

* `[prefix]` - Optional prefix.
* `handler` - An object containing nested objects and functions.

__Examples__

[Sample2: multiple handlers](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample2-multi-handlers.js)

### startServer(port, [callback])

Start express server on the given port.
Express 3 vs 4 will be automatically detected.

__Arguments__

* `port` - Port number.
* `[callback]` - An optional callback handler that will be called when the server starts.

__Examples__

* [Sample1](http://bitbucket.org/ralphv/nodetastic/src/master/samples/sample1.js)

### setTranslateResultFunction()
__Arguments__
__Examples__

### injectReservedValue()
__Arguments__
__Examples__

### setGlobalPrefix()
__Arguments__
__Examples__

### setupSocketIO()
__Arguments__
__Examples__

### setTemporaryHalt()
__Arguments__
__Examples__

### removeTemporaryHalt()
__Arguments__
__Examples__

### registerNewSessionFunction()
__Arguments__
__Examples__

### attachGlobalService()
__Arguments__
__Examples__

### attachService()
__Arguments__
__Examples__

### getRouteRequestFunction()
__Arguments__
__Examples__

### $authorizeFunction()
__Arguments__
__Examples__

### $getFunction()
__Arguments__
__Examples__


## License

nodetastic is licensed under the [BSD-3 License](http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE).

## Changelog

* 0.1.2: APIs documentation added.

* 0.1.1: Samples added.

* 0.1.0: Initial version.