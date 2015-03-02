# Ravel
[![npm version](https://badge.fury.io/js/ravel.svg)](http://badge.fury.io/js/ravel) [![Build Status](https://travis-ci.org/Ghnuberath/ravel.svg?branch=master)](https://travis-ci.org/Ghnuberath/ravel) [![Coverage Status](https://coveralls.io/repos/Ghnuberath/ravel/badge.svg?branch=master)](https://coveralls.io/r/Ghnuberath/ravel?branch=master) [![Dependency Status](https://david-dm.org/Ghnuberath/ravel.svg)](https://david-dm.org/Ghnuberath/ravel)

Forge past a tangle of node.js modules. Make a cool app.

## Introduction

Ravel is a tiny, sometimes-opinionated core distilled from lessons learned while developing large node.js apps.

Layered on top of such fantastic technologies as [Express](https://github.com/strongloop/express), [Primus](https://github.com/primus/primus), [Passport](https://github.com/jaredhanson/passport) and [Redis](https://github.com/antirez/redis), Ravel aims to provide a pre-baked, well-tested and highly modular solution for problems common to many enterprise web applications:

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
