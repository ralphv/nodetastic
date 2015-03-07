## nodetastic - A dependency injection http server with a twist, built on top of express

[![NPM](https://nodei.co/npm/nodetastic.png?mini=true)](https://nodei.co/npm/nodetastic/)

* [Features](#features)
* [Getting started](#getting-started)
* [The command line](#the-command-line)
* [Advanced Examples](#advanced-examples)
* [License](#license)
* [Changelog](#changelog)

### Features

* A web server with a dependency injection engine.
* Parameters of functions are either reserved words (services) or GET/POST parameters.
* Basic GET/POST parameters are automatically checked and can be type checked as well.
* If you are familiar with AngularJS, you will feel right at home.
* In theory your code can be used by multiple transport layers (other than http) because of the abstraction provided.
* Support for client side caching (304) and server side cashing.
* Support for integrated socket.io handling.
* Support for side loading services that can control the flow of requests/responses.
* Built on top of express, it will automatically detect express 3 vs express 4.
* Built in server or integrate with your own setup.

### Getting started

    $ npm install -g nodetastic

Simple examples:



### The command line

The command line arguments you pass serve the purpose of modifying one or more configuration properties found in [./config.js](http://bitbucket.org/ralphv/nodetastic/src/master/config.js).
The format of the arguments is in the form of X=Y, check the next samples.
You could also modify options via setOptions function.

    $ node (your project) param=value
    $ node (your project) 'param=value with spaces'
    $ node (your project) 'array_param=["array element 1", "array element 2"]'
    $ node (your project) array_param=element_one,element_two,element_three

### Advanced examples

### License

nodetastic is licensed under the [BSD-3 License](http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE).

### Changelog

* 0.1.0: Initial version.