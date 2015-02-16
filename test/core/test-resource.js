'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var mockery = require('mockery');
var path = require('path');
var sinon = require('sinon');
var express = require('express');

var Ravel;

describe('Ravel', function() {
  beforeEach(function(done) {
    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel('NONE');
    //mock broadcast, kvstore, authorize, authorizeWithRedirect and db.middleware, since they only get created during Ravel.start
    Ravel.broadcast = {
      emit: function(){}
    };
    Ravel.kvstore = {};
    Ravel.db = {
      middleware: function(){}
    };
    Ravel.authorize = function() {};
    Ravel.authorizeWithRedirect = function() {};

    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.disable();
    done();
  });

  describe('#resource()', function() {
    it('should allow clients to register resource modules for instantiation in Ravel.start, and assign them a base path', function(done) {
      Ravel.resource('/api/test', './resources/test');
      expect(Ravel._resourceFactories).to.have.property('/api/test');
      expect(Ravel._resourceFactories['/api/test']).to.be.a('function');
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple resource modules with the same base path', function(done) {
      try {
        Ravel.resource('/api/test', './resources/test');
        Ravel.resource('/api/test', './resources/test2');
        done(new Error('It should be impossible to register two resource modules with the same base path.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.DuplicateEntry);
        done();
      }
    });

    it('should produce a factory function which can be used to instantiate the specified resource module and perform dependency injection with specific, resource-related services', function(done) {
      var stub = function($E, $L, $KV, $EndpointBuilder, $Rest, $Broadcast, $Private, $PrivateRedirect, $MiddlewareTransaction) {
        expect($E).to.equal(Ravel.ApplicationError);
        expect($L).to.be.an('object');
        expect($L).to.have.property('trace').that.is.a('function');
        expect($L).to.have.property('verbose').that.is.a('function');
        expect($L).to.have.property('debug').that.is.a('function');
        expect($L).to.have.property('info').that.is.a('function');
        expect($L).to.have.property('warn').that.is.a('function');
        expect($L).to.have.property('error').that.is.a('function');
        expect($L).to.have.property('critical').that.is.a('function');
        expect($KV).to.be.ok;
        expect($KV).to.be.an('object');
        expect($KV).to.equal(Ravel.kvstore);
        expect($KV).to.be.ok;
        expect($EndpointBuilder).to.be.an('object');
        expect($EndpointBuilder).to.have.property('getAll').that.is.a('function');
        expect($EndpointBuilder).to.have.property('putAll').that.is.a('function');
        expect($EndpointBuilder).to.have.property('deleteAll').that.is.a('function');
        expect($EndpointBuilder).to.have.property('get').that.is.a('function');
        expect($EndpointBuilder).to.have.property('put').that.is.a('function');
        expect($EndpointBuilder).to.have.property('post').that.is.a('function');
        expect($EndpointBuilder).to.have.property('delete').that.is.a('function');
        expect($Rest).to.be.an('object');
        expect($Rest).to.have.property('buildRestResponse').that.is.a('function');
        expect($Rest).to.have.property('handleRangeGet').that.is.a('function');
        expect($Broadcast).to.equal(Ravel.broadcast);
        expect($Private).to.equal(Ravel.authorize);
        expect($PrivateRedirect).to.equal(Ravel.authorizeWithRedirect);
        expect($MiddlewareTransaction).to.equal(Ravel.db.middleware);
        done();

        return {};
      };
      Ravel.resource('/api/test', 'test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      var app = express();
      Ravel._resourceFactories['/api/test'](app);
    });

    /*it('should facilitate the creation of GET routes via $EndpointBuilder.getAll, but not permit the use of other HTTP verbs', function(done) {
    });

    it('should facilitate the creation of GET routes via $EndpointBuilder.get, but not permit the use of other HTTP verbs', function(done) {
    });

    it('should facilitate the creation of POST routes via $EndpointBuilder.post, but not permit the use of other HTTP verbs', function(done) {
    });

    it('should facilitate the creation of PUT routes via $EndpointBuilder.put, but not permit the use of other HTTP verbs', function(done) {
    });

    it('should facilitate the creation of PUT routes via $EndpointBuilder.putAll, but not permit the use of other HTTP verbs', function(done) {
    });

    it('should facilitate the creation of GET routes via $EndpointBuilder.deleteAll, but not permit the use of other HTTP verbs', function(done) {
    });

    it('should facilitate the creation of GET routes via $EndpointBuilder.delete, but not permit the use of other HTTP verbs', function(done) {
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry when a method of $EndpointBuilder is used twice', function(done) {
    });*/
  });
});
