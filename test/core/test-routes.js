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
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    
    Ravel = new require('../../lib/ravel')();
    Ravel.Log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#routes()', function() {
    it('should permit clients to register route modules for instantiation in Ravel.start', function(done) {
      Ravel.routes('./routes/index_r');
      expect(Ravel._routesFactories).to.have.property('./routes/index_r');
      expect(Ravel._routesFactories['./routes/index_r']).to.be.a('function');
      done();
    });

    it('should throw ApplicationError.DuplicateEntry when a client attempts to register the same route module twice', function(done) {
      try {
        Ravel.routes('./routes/index_r');
        Ravel.routes('./routes/index_r');
        done(new Error('Registering the same route module twice should be impossible'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.DuplicateEntry);
        done();
      }
    });

    it('should produce a factory function which can be used to instantiate the specified routes module and perform dependency injection with specific, route-related services', function(done) {
      //stub broadcast, authorize and authorizeWithRedirect, since they only get created during Ravel.start
      Ravel.broadcast = {
        emit: function(){}
      };
      Ravel.authorize = function() {};
      Ravel.authorizeWithRedirect = function() {};
      var stub = function($E, $L, $KV, $RouteBuilder, $Broadcast, $Private, $PrivateRedirect) {
        expect($E).to.be.ok;
        expect($E).to.be.an('object');
        expect($E).to.equal(Ravel.ApplicationError);
        expect($L).to.be.ok;
        expect($L).to.be.an('object');
        expect($L).to.have.property('trace').that.is.a('function');
        expect($L).to.have.property('verbose').that.is.a('function');
        expect($L).to.have.property('debug').that.is.a('function');
        expect($L).to.have.property('info').that.is.a('function');
        expect($L).to.have.property('warn').that.is.a('function');
        expect($L).to.have.property('error').that.is.a('function');
        expect($L).to.have.property('critical').that.is.a('function');
        expect($KV).to.equal(Ravel.kvstore);
        expect($RouteBuilder).to.be.an('object');
        expect($RouteBuilder).to.have.property('add').that.is.a('function');
        expect($Broadcast).to.equal(Ravel.broadcast);
        expect($Private).to.equal(Ravel.authorize);
        expect($PrivateRedirect).to.equal(Ravel.authorizeWithRedirect);
        done();

        return {};
      };
      Ravel.routes('stub');
      mockery.registerMock(path.join(Ravel.cwd, 'stub'), stub);
      Ravel._routesFactories['stub']();
    });

    it('should facilitate the creation of GET routes via $RouteBuilder.add, but not permit the use of other HTTP verbs', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($RouteBuilder) {
        $RouteBuilder.add('/app/path', middleware1, middleware2);
      };
      Ravel.routes('stub');
      mockery.registerMock(path.join(Ravel.cwd, 'stub'), stub);

      //load up express
      var app = express();
      sinon.stub(app, 'get', function() {
        expect(arguments[0]).to.equal('/app/path');
        expect(arguments[1]).to.equal(middleware1);
        expect(arguments[2]).to.equal(middleware2);
        done();
      });
      sinon.stub(app, 'post', function() {
        done(new Error('$RouteBuilder should never use app.post.'));
      });
      sinon.stub(app, 'put', function() {
        done(new Error('$RouteBuilder should never use app.put.'));
      });
      sinon.stub(app, 'delete', function() {
        done(new Error('$RouteBuilder should never use app.delete.'));
      });

      Ravel._routesFactories['stub'](app);
    });
  });
});
