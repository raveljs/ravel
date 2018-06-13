'use strict';

const $err = require('./application_error');
const redis = require('redis');

/*!
 * Reconnection strategy for redis
 */
function retryStrategy (ravelInstance) {
  return function (options) {
    const code = options.error ? options.error.code : 'Reason Unknown';
    if (code === 'ECONNREFUSED') {
      // End reconnecting on a specific error and flush all commands with a individual error
      ravelInstance.log.error(`Lost connection to redis: ${code}.`);
      return new $err.General(`Lost connection to redis: ${code}.`);
    } else if (options.attempt > ravelInstance.get('redis max retries')) {
      ravelInstance.log.error(`Lost connection to redis: ${code}. Max retry attempts exceeded.`);
      // End reconnecting with built in error
      return new $err.General(
        `Lost connection to redis: ${code}. Max retry attempts reached.`);
    } else {
      const time = Math.pow(options.attempt, 2) * 100;
      ravelInstance.log.error(`Lost connection to redis: ${code}. Reconnecting in ${time} milliseconds.`);
      // reconnect after
      return time;
    }
  };
}

/**
 * For disabling redis methods.
 *
 * @param {Object} client - Client to disable a method on.
 * @param {string} fn - Name of the function to disable.
 * @private
 */
function disable (client, fn) {
  client[fn] = function () {
    throw new $err.General(
      `kvstore cannot use ${fn}(). Use kvstore.clone() to retrieve a fresh connection first.`);
  };
}

/**
 * Returns a fresh connection to Redis.
 *
 * @param {Ravel} ravelInstance - An instance of a Ravel app.
 * @param {boolean} restrict - Iff true, disable `exit`, `subcribe`, `psubscribe`, `unsubscribe` and `punsubscribe`.
 * @returns {Object} Returns a fresh connection to Redis.
 * @private
 */
function createClient (ravelInstance, restrict = true) {
  const localRedis = ravelInstance.get('redis port') === undefined || ravelInstance.get('redis host') === undefined;
  ravelInstance.on('post init', () => {
    ravelInstance.log.info(localRedis
      ? 'Using in-memory key-value store. Please do not scale this app horizontally.'
      : `Using redis at ${ravelInstance.get('redis host')}:${ravelInstance.get('redis port')}`);
  });
  let client;
  if (localRedis) {
    const mock = require('redis-mock');
    mock.removeAllListeners(); // redis-mock doesn't clean up after itself very well.
    client = mock.createClient();
    client.flushall(); // in case this has been required before
  } else {
    client = redis.createClient(
      ravelInstance.get('redis port'),
      ravelInstance.get('redis host'),
      {
        'no_ready_check': true,
        'retry_strategy': retryStrategy(ravelInstance)
      });
  }
  if (ravelInstance.get('redis password')) {
    client.auth(ravelInstance.get('redis password'));
  }
  // log errors
  client.on('error', ravelInstance.log.error);

  // keepalive when not testing
  const redisKeepaliveInterval = setInterval(() => {
    client && client.ping && client.ping();
  }, ravelInstance.get('redis keepalive interval'));
  ravelInstance.once('end', () => {
    clearInterval(redisKeepaliveInterval);
  });

  if (restrict) {
    disable(client, 'quit');
    disable(client, 'subscribe');
    disable(client, 'psubscribe');
    disable(client, 'unsubscribe');
    disable(client, 'punsubscribe');
  } else {
    const origQuit = client.quit;
    client.quit = function (...args) {
      clearInterval(redisKeepaliveInterval);
      return origQuit.apply(client, args);
    };
  }

  client.clone = function () {
    return createClient(ravelInstance, false);
  };

  return client;
}

/**
 * Abstraction for redis-like data store.
 *
 * @param {Ravel} ravelInstance - An instance of a Ravel app.
 * @private
 */
module.exports = createClient;

module.exports.retryStrategy = retryStrategy;
