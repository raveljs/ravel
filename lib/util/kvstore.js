'use strict';

const redis = require('redis');
const events = require('events');

/**
 * Abstraction for redis-like data store
 * Handles reconnections gracefully - something that node-redis claims to do but doesn't, actually.
 *
 * With help from https://www.exratione.com/2013/01/nodejs-connections-will-end-close-and-otherwise-blow-up/
 */
module.exports = function(ravelInstance) {

  const client = {};

  const kvstore = new events.EventEmitter();

  function replace(first) {
    if (!first) {
      kvstore.emit('replace');
    }
    if (client.end) {
      client.closing = true;
      client.end();
    }
    const newClient = redis.createClient(ravelInstance.get('redis port'), ravelInstance.get('redis host'), {});
    if (ravelInstance.get('redis password')) {
      newClient.auth(ravelInstance.get('redis password'));
    }
    newClient.once('end', function() {
      replace();
    });
    //copy over redis methods to client reference
    //TODO add key prefixes
    Object.assign(client, newClient);
    //TODO handle pub/sub
  }
  replace(true);

  return client;
};
