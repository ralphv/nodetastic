# nodetastic - A dependency injection Node.JS API Server with a twist

[![Join the chat at https://gitter.im/ralphv/nodetastic](https://badges.gitter.im/ralphv/nodetastic.svg)](https://gitter.im/ralphv/nodetastic?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM](https://nodei.co/npm/nodetastic.png?mini=true)](https://nodei.co/npm/nodetastic/)

* [Features](#features)
* [Getting started](#getting-started)
* [Samples](#samples)
* [API](#api)
* [Reserved words](#reserved-words)
* [The command line](#the-command-line)
* [License](#license)
* [Changelog](#change-log)

## Features

* A web server with a dependency injection engine.
* Advanced meta-data per function (Attributes in C#/Annotations in JAVA) via specially formatted embedded comments.
* Parameters of functions are either reserved words (factories) or GET/POST parameters.
* Basic GET/POST parameters are automatically checked and can be type checked as well via hungarian notation.
* Path is deduced from the nesting structure of handlers.
* If you are familiar with AngularJS, you will feel right at home.
* In theory your code can be used by multiple transport layers (other than http) because of the abstraction provided.
* Support for client side caching (304) and server side cashing.
* Support for integrated socket.io handling.
* Support for side loading services that have access to meta-data and can control the flow of requests/responses.
* Built on top of express, it will automatically detect express 3 vs express 4.
* Built-in server or integrate with your own setup.
* Don't like the different routing approach nodetastic offers? use mapper.wrap directly with express functions.

## Getting started

    $ npm install -g nodetastic

Simple example:

```javascript
var nodetastic = require("nodetastic");

var mapper = nodetastic.CreateNodeTastic();

mapper.registerController({
  HelloNodeTastic: function(cb) { // http://localhost/HelloNodeTastic
    cb(null, "Hello NodeTastic!");
  },
  HelloBack: function(strName, cb) { // http://localhost/HelloBack?strName=Master
    cb(null, "Hello " + strName + "!");
  },
  session: {
    set : function($session, objData, cb) { // http://localhost/session/set?objData={"key":"value}
      $session.set("data", objData);
      cb();
    },
    get: function($session, cb) { // http://localhost/session/get
      cb(null, $session.get("data"));
    }
  }
});

mapper.startServer(80);
```

## Samples

* [Sample1](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample1.js)
Basic sample (getting started).

* [Sample2: multiple handlers](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample2-multi-handlers.js)
Register multiple handlers with different prefixes.

* [Sample3: new session initializer](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample3-reg-new-session-fn.js)
Register new session function that gets called on new sessions, get a chance to initialize code as you need.

* [Sample4: states, loggedIn, loggedOut and access control](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample4-states-login-logout.js)
Make use of the service "StateService", define two basic states. Control access to APIs based on current state.

* [Sample5: make use of meta-data for simple cash control](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample5-meta-data-expires.js)
Make use of the meta-data feature in nodetastic, use the service "ExpiresService" to provide simple cash control.

* [Sample6: inject your own reserved words](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample6-custom-reserved-words.js)
See how easy it is to add your own set of reserved words and consume them easily in your functions.
The best of dependency injection at work.

* [Sample7: control client side cash (304)](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample7-client-cache.js)
Multiple levels of cash control.

* [Sample8: server side cash](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample8-server-cache.js)
Server side easy cash control.

* [Sample9: Supply functions dynamically](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample9-get-function.js)
Supply functions dynamically at runtime.

* [Sample10: Use DI directly with express](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample10-with-express.js)
Don't like the built in routing of nodetastic, use it's DI engine directly with express.

## API

### setOptions(config)

Change the options of nodetastic.
The properties are those of [./config.js](https://raw.githubusercontent.com/ralphv/nodetastic/master/config.js).

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

[Sample1](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample1.js)

### registerController([prefix], handler)

Register an object as a handler for a certain url prefix or for the top level (without prefix).
Nodetastic resolves paths differently. It deduces the path relative to the object's properties.
Each sub-object is a url path part and each function is an endpoint target.

__Arguments__

* `[prefix]` - Optional prefix.
* `handler` - An object containing nested objects and functions.

__Examples__

[Sample2: multiple handlers](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample2-multi-handlers.js)

### startServer(port, [callback])

Start express server on the given port.
Express 3 vs 4 will be automatically detected.

__Arguments__

* `port` - Port number.
* `[callback]` - An optional callback handler that will be called when the server starts.

__Examples__

[Sample1](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample1.js)

### setTranslateResultFunction(fn)

Set a translation function. This function will be called to translate between cb-result and between the actual object that will be returned as JSON over http.

__Arguments__

* `fn(result)` - Takes in the result object and returns the desired translated object.

__Examples__

[Sample1](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample1.js)

### injectReservedValue(reservedValueName, fn)

Creates a custom reserved value that you "request" in your handler functions.
The `fn` will be called whenever the reserved value is required by a handler function.
The parameters of fn should always start with two variables, `[context](#context)` and `param`.
The `fn` can depend on other reserved words as long as they don't have a circular dependency.
If you specify the last parameter as `cb` then this is an indicator that `fn` is to be called in async mode.

__Arguments__

* `reservedValueName` - The reserved value name. Should always start with a $ sign.
* `fn` the function that will provide the reserved value.

__Examples__

[Sample6: inject your own reserved words](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample6-custom-reserved-words.js)

### setGlobalPrefix(prefix)

Sometimes it is useful to have a global prefix added to all handlers, this is usually in environments behind a reverse proxy.

__Arguments__

* `prefix` - The prefix to use

### setupSocketIO(sessionToSocketIORoomFn, socketIoReceiveDataFn)

Easily integrate socket.io in your server code. On the client side you should attempt to connect after you establish proper authorization (login)
and disconnect when you logout.

__Arguments__

* `sessionToSocketIORoomFn(session)` - A function that takes a session object (raw session) and should return a room id for socket.io
Basically this would be something that identifies your session either uniquely (if you want a room per session).
Or it can be some session information data such as the logged in user id, in this case all users logged in with the same id will share the same chat room.
* `socketIoReceiveDataFn(data)` - A function handler that will receive the data sent from the client.

__Examples__

(will follow)

### setTemporaryHalt(object)

If you need to temporary halt all responses and return one data for all functions.
It can be data that indicates a temporary state, like server under maintenance.

__Arguments__

* `object` - The raw object to return for all responses.

### removeTemporaryHalt()

Remove the temporary halt.

### registerNewSessionFunction(newSessionFn)

If you need to do any initialization for new sessions, pass a handler to this function.

__Arguments__

* `newSessionFn([context](#context), $inject, cb)` -  The handler would take the [context](#context) object, $inject to allow access to any reserved values and a callback to call when done.

__Examples__

[Sample3: new session initializer](https://raw.githubusercontent.com/ralphv/nodetastic/master/samples/sample3-reg-new-session-fn.js)

### getRouteRequestFunction()

While nodetastic has it's own server code that you can use with [startServer](#start-server) sometimes you might want to integrate it with code you already have.

__Examples__

```js
var nodetastic = require("nodetastic");

var mapper = nodetastic.CreateNodeTastic();
// setup mapper as needed (handlers, reserved words...)

// app is your express server from your existing setup
// link routes
app.all('*', mapper.getRouteRequestFunction());
app.disable('etag');
```

### Context object definition

The context is an object that has all the data needed for the current request/response to be processed by nodetastic.
The current step of processing will effect the properties the context has so far.

__Properties__

* `req` - The underlying request object (http/express). You should not use this directly.
* `res` - The underlying response object (http/express). You should not use this directly.
* `skipInvokeFunction(data)` - A function that can be used from services to skip calling the target function and return the data supplied instead.
* `invoke_cb_result` - The cb-result object when the target function has been called and it's data returned.
* `resultObject` - The translated invoke_cb_result that should be returned instead. Use [setTranslateResultFunction](#set-translate-result-function) to setup the translator.
* `handler` - The handler responsible for this request, based on the registered handlers and their prefixes.
* `fn` - The target function of the handler that will be called to process this request/response.
* `args` - The compiled arguments that will be sent to the target function, the dependency injection engine will decide what they are.
* `map.params` - The data generated by the discovery function of the dependency injection engine.
* `meta` - The meta-data object extracted from the specially formulated embedded comments inside the target function. //<meta>{...}</meta>
* `$session` - The session wrapper object of the current request/response.

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

## The command line

The command line arguments you pass serve the purpose of modifying one or more configuration properties found in [./config.js](https://raw.githubusercontent.com/ralphv/nodetastic/master/config.js).
The format of the arguments is in the form of X=Y, check the next samples.
You could also modify options via setOptions function.

    $ node (your project) param=value
    $ node (your project) 'param=value with spaces'
    $ node (your project) 'array_param=["array element 1", "array element 2"]'
    $ node (your project) array_param=element_one,element_two,element_three

## License

nodetastic is licensed under the [BSD-3 License](https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE).

## Changelog

* 1.0.1: Add support for promises. Add support for advanced format.

* 1.0.0: Change to github

* 0.1.4: Added ability to use the DI injection directly in express commands.

* 0.1.3: Added ability to call functions post-fixed with method name.

* 0.1.2: APIs documentation added.

* 0.1.1: Samples added.

* 0.1.0: Initial version.