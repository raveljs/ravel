# Ravel
[![npm version](https://badge.fury.io/js/ravel.svg)](http://badge.fury.io/js/ravel) [![Build Status](https://travis-ci.org/Ghnuberath/ravel.svg?branch=master)](https://travis-ci.org/Ghnuberath/ravel) [![Coverage Status](https://coveralls.io/repos/Ghnuberath/ravel/badge.svg?branch=master)](https://coveralls.io/r/Ghnuberath/ravel?branch=master) [![Dependency Status](https://david-dm.org/Ghnuberath/ravel.svg)](https://david-dm.org/Ghnuberath/ravel)

Forge past a tangle of node.js modules. Make a cool app.

## Introduction

Ravel is a tiny, sometimes-opinionated core distilled from lessons learned while developing large node.js apps.

Layered on top of such fantastic technologies as [Express](https://github.com/strongloop/express), [Primus](https://github.com/primus/primus), [Passport](https://github.com/jaredhanson/passport), [Intel](https://github.com/seanmonstar/intel) and [Redis](https://github.com/antirez/redis), Ravel aims to provide a pre-baked, well-tested and highly modular solution for problems common to many enterprise web applications:

 - Dependency injection
 - A set of well-defined architectural components
 - Automatic database transaction management
 - Authentication and authorization with transparent handling of mobile (i.e. non-web) clients
 - Standards-compliant REST API definition
 - Websocket-based front-end model synchronization
 - Easy security, via an enforced, reference configuration of [Express](https://github.com/strongloop/express)
 - Horizontal scalability

## Installation

    $ npm install ravel

Ravel also needs [Redis](https://github.com/antirez/redis). As part of the 1.0 release, a reference project including a [Vagrant](https://www.vagrantup.com/) development VM will be provided as a [Yeoman](http://yeoman.io/) generator, but for now you'll need to install Redis somewhere yourself.

## Building a Ravel Application

### Make a module

Business logic sits in plain old modules, which are generally not network-aware.

*modules/cities.js*

    module.exports = function($E, $L) {
      var Cities = {};
      var c = ['Toronto', 'New York', 'Chicago'];

      Cities.getAllCities = function(callback) {
        callback(null, c);
      };

      Cities.getCity = function(name, callback) {
        var index = c.indexOf(name);
        if (index) {
          callback(null, c[index]);
        } else {
          $L.warn('User requested unknown city ' + name);
          callback(new $E.NotFound('City ' + name + ' does not exist.'), null);
        }
      };

      return Cities;
    }

Note that modules are functions which support **Dependency Injection**. $E (a toolbox of common errors) and $L (logging) are injected automatically, but you may also inject NPM modules and your own modules side-by-side by name without any require statements or relative paths.

Non-function modules are also supported, and dependency injection will not be performed on them.

To register and name your module, we need a top-level *app.js* file:

*app.js*

    var Ravel = require('ravel');
    //...we'll initialize Ravel with some properties later

    // supply the name for the module, and its path
    Ravel.module('cities', './modules/cities');
