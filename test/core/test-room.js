'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');

let Ravel, rooms;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    rooms = {};
    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    require('../../lib/core/room')(Ravel, rooms);
    done();
  });

  afterEach(function(done) {
    rooms = undefined;
    Ravel = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#room()', function() {
    it('should throw Ravel.ApplicationError.DuplicateEntry if a room with a given pattern has already been registered', function(done) {
      rooms['/test'] = {};
      try {
        Ravel.room('/test');
        done(new Error('Duplicate room patterns should result in a Ravel.ApplicationError.DuplicateEntry'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.DuplicateEntry);
        done();
      }
    });

    it('should throw Ravel.ApplicationError.IllegalValue if the supplied authorization function is not a function', function(done) {
      try {
        Ravel.room('/test', {});
        done(new Error('Non-function authorizationFunctions should result in a Ravel.ApplicationError.IllegalValue'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.IllegalValue);
        done();
      }
    });

    it('should permit clients to register rooms which support path parameters and authorization functions', function(done) {
      const authorizationFunction = function(userId, done2) {
        done2(null, true);
      };
      Ravel.room('/test/:testId/entity/:entityId', authorizationFunction);
      expect(rooms).have.property('/test/:testId/entity/:entityId').that.deep.equals({
        name: '/test/:testId/entity/:entityId',
        params: ['testId', 'entityId'],
        regex: new RegExp('/test/(\\w+)/entity/(\\w+)'),
        authorize: authorizationFunction
      });
      const match = '/test/1/entity/2'.match(rooms['/test/:testId/entity/:entityId'].regex);
      expect(match[0]).to.equal('/test/1/entity/2');
      expect(match[1]).to.equal('1');
      expect(match[2]).to.equal('2');
      done();
    });

    it('should permit clients to register public rooms without authorization functions', function(done) {
      Ravel.room('/test/:testId/entity/:entityId');
      expect(rooms['/test/:testId/entity/:entityId']).have.property('name').that.equals('/test/:testId/entity/:entityId');
      expect(rooms['/test/:testId/entity/:entityId']).have.property('params').that.deep.equals(['testId', 'entityId']);
      expect(rooms['/test/:testId/entity/:entityId']).have.property('regex').that.deep.equals(new RegExp('/test/(\\w+)/entity/(\\w+)'));
      expect(rooms['/test/:testId/entity/:entityId']).have.property('authorize').that.is.a('function');
      rooms['/test/:testId/entity/:entityId'].authorize(1, function(err, isAuthorized) {
        expect(err).to.be.null;
        expect(isAuthorized).to.be.ok;
        done();
      });
    });

    //TODO room path normalization
  });
});
