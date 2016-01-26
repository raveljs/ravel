'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');

let roomResolver, rooms;

describe('ws/util/websocket_room_resolver', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    rooms = {};
    roomResolver = require('../../../lib/ws/util/websocket_room_resolver')(rooms);
    done();
  });

  afterEach(function(done) {
    rooms = undefined;
    roomResolver = undefined;
    mockery.deregisterAll();mockery.disable();
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
      let resolution = roomResolver.resolve('/entities/users/1');
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
      const resolution = roomResolver.resolve('/entities/users/1');
      expect(resolution).to.have.property('instance').that.equals('/entities/users/1');
      expect(resolution).to.have.property('params').that.deep.equals({
        'userId':'1'
      });
      expect(resolution).to.have.property('room').that.equals(rooms['/entites/users/:userId']);
      done();
    });
  });
});
