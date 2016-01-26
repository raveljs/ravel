'use strict';

/**
 * Abstraction for redis-like data store
 * Handles reconnections gracefully - something that node-redis claims to do but doesn't, actually.
 *
 * With help from https://www.exratione.com/2013/01/nodejs-connections-will-end-close-and-otherwise-blow-up/
 */
//Should probably read this one day:
//http://ngchi.wordpress.com/2010/08/23/towards-auto-sharding-in-your-node-js-app/
//it's about node-hash-ring, which appears to be written by the same guy who did node-redis.
//Forcing everything to go through this should help if we need to replace/shard/cluster redis one day.

const redis = require('redis');
const events = require('events');

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
