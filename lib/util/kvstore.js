'use strict';

const ApplicationError = require('./application_error');
const redis = require('redis');

/*!
 * Reconnection strategy for redis
 */
function retryStrategy (ravelInstance) {
  return function (options) {
    if (options.error.code === 'ECONNREFUSED') {
      // End reconnecting on a specific error and flush all commands with a individual error
      ravelInstance.log.error(`Lost connection to redis: ${options.error.code}.`);
      return new ApplicationError.General(`Lost connection to redis: ${options.error.code}.`);
    } else if (options.attempt > ravelInstance.get('redis max retries')) {
      ravelInstance.log.error(`Lost connection to redis: ${options.error.code}. Max retry attempts exceeded.`);
      // End reconnecting with built in error
      return new ApplicationError.General(
        `Lost connection to redis: ${options.error.code}. Max retry attempts reached.`);
    } else {
      const time = Math.pow(options.attempt, 2) * 100;
      ravelInstance.log.error(`Lost connection to redis: ${options.error.code}. Reconnecting in ${time} milliseconds.`);
      // reconnect after
      return time;
    }
  };
}

/**
 * Abstraction for redis-like data store.
 *
 * @param {Ravel} ravelInstance - An instance of a Ravel app.
 * @private
 */
module.exports = function (ravelInstance) {
  const client = redis.createClient(
    ravelInstance.get('redis port'),
    ravelInstance.get('redis host'),
    {
      'no_ready_check': true,
      'retry_strategy': retryStrategy(ravelInstance)
    });
  if (ravelInstance.get('redis password')) {
    client.auth(ravelInstance.get('redis password'));
  }

  return client;
};

module.exports.retryStrategy = retryStrategy;
