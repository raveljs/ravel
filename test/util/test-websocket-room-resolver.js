'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));

var roomResolver, rooms;

describe('util/websocket_room_resolver', function() {
  beforeEach(function(done) {
    rooms = {};
    roomResolver = require('../../lib-cov/util/websocket_room_resolver')(rooms);
    done();
  });

  afterEach(function(done) {
    rooms = undefined;
    roomResolver = undefined;
    done();
  });

  describe('#resolve()', function() {
    it('should return undefined when no registered room matches the given url pattern', function(done) {
      expect(roomResolver.resolve('/entities/tasks/1')).to.be.undefined;
      done();
    });

    it('should return the room object matching the given url pattern, if one is found', function(done) {
      rooms['/entites/tasks/:taskId'] = {
        name: '/entites/tasks/:taskId',
        params: ['taskId'],
        regex: /\/entities\/tasks\/(\w+)/,
        authorize: function(){}
      };
      rooms['/entites/users/:userId'] = {
        name: '/entites/users/:userId',
        params: ['userId'],
        regex: /\/entities\/users\/(\w+)/,
        authorize: function(){}
      };
      var resolution = roomResolver.resolve('/entities/users/1');
      expect(resolution).to.have.property('instance').that.equals('/entities/users/1');
      expect(resolution).to.have.property('params').that.deep.equals({
        'userId':'1'
      });
      expect(resolution).to.have.property('room').that.equals(rooms['/entites/users/:userId']);
      resolution = roomResolver.resolve('/entities/users/smcintyre');
      expect(resolution).to.have.property('instance').that.equals('/entities/users/smcintyre');
      expect(resolution).to.have.property('params').that.deep.equals({
        'userId':'smcintyre'
      });
      expect(resolution).to.have.property('room').that.equals(rooms['/entites/users/:userId']);
      done();
    });

    it('should cache resolved rooms', function(done) {
      rooms['/entites/users/:userId'] = {
        name: '/entites/users/:userId',
        params: ['userId'],
        regex: /\/entities\/users\/(\w+)/,
        authorize: function(){}
      };
      roomResolver.resolve('/entities/users/1');
      delete rooms['/entites/tasks/:taskId'];
      var resolution = roomResolver.resolve('/entities/users/1');
      expect(resolution).to.have.property('instance').that.equals('/entities/users/1');
      expect(resolution).to.have.property('params').that.deep.equals({
        'userId':'1'
      });
      expect(resolution).to.have.property('room').that.equals(rooms['/entites/users/:userId']);
      done();
    });
  });
});
