## nodetastic - A dependency injection http server with a twist, built on top of express

[![NPM](https://nodei.co/npm/nodetastic.png?mini=true)](https://nodei.co/npm/nodetastic/)

* [Features](#features)
* [Getting started](#getting-started)
* [The command line](#the-command-line)
* [Reserved Values](#reserved-values)
* [API](#api)
* [License](#license)
* [Changelog](#changelog)

### Features

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

### Getting started

    $ npm install -g nodetastic

Simple example:

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

More samples and advanced examples can be found under samples folder.

### The command line

The command line arguments you pass serve the purpose of modifying one or more configuration properties found in [./config.js](http://bitbucket.org/ralphv/nodetastic/src/master/config.js).
The format of the arguments is in the form of X=Y, check the next samples.
You could also modify options via setOptions function.

    $ node (your project) param=value
    $ node (your project) 'param=value with spaces'
    $ node (your project) 'array_param=["array element 1", "array element 2"]'
    $ node (your project) array_param=element_one,element_two,element_three

### Reserved values

You can add your own reserved values (i.e. factory in AngularJS) via the api function injectReservedValue.
Reserved words always start with $sign, otherwise it will be a GET/POST parameter.
The set of built in reserved words:

    * $session: An object that provides access to session variables via setters/getters
    * $eTagChecksum: The passed etag that the client passes with the request
    * $cache$[XX]: Access to server side cache, the XX is the number of minutes. (ex: $cache$15, $cache$30)
    * $files: Access to uploaded files
    * $data: GET/POST data for those parameters that are not always mandatory
    * $urlParams: Data embedded in path parameters by preceding the path part with a $ sign ex: /path/$param1/get
    * $HttpCacheIndicator: A helper class for controlling client side caching (304)
    * $inject: Provides access to other reserved words
    * $socket: emit data to socket.io (only supported with express4 + socket.io integration)

The following reserved words are also available but it is recommended not to use them.
They will bind your code with http related concepts and break the abstraction.

    * $path: The path of the http request
    * $request: The req object
    * $response: The res object
    * $method: The method of the http request
    * $body: Data passed through (POST) parameters
    * $query: Data passed through query parameters (GET)

### API

(details will follow)

    setOptions
    CreateNodeTastic

    registerHandler
    startServer
    setTranslateResultFunction
    injectReservedValue
    setGlobalPrefix
    setupSocketIO

    setTemporaryHalt
    removeTemporaryHalt
    registerNewSessionFunction
    attachGlobalService
    attachService
    getRouteRequestFunction

    $authorizeFunction
    $getFunction

### License

nodetastic is licensed under the [BSD-3 License](http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE).

### Changelog

* 0.1.0: Initial version.