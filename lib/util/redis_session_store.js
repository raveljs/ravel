'use strict';

const EventEmitter = require('events').EventEmitter;
const sRavelInstance = Symbol('ravelInstance');

/**
 * Shorthand for adapting callbacks to `Promise`s.
 *
 * @param {Function} resolve - A resolve function.
 * @param {Function} reject - A reject function.
 * @private
 */
function finishBasicPromise (resolve, reject) {
  return (err, res) => {
    if (err) {
      return reject(err);
    } else {
      return resolve(res);
    }
  };
}

/**
 * Replacement for koa-redis
 *
 * @private
 */
class RedisSessionStore extends EventEmitter {
  constructor (ravelInstance) {
    super();
    this[sRavelInstance] = ravelInstance;
    this[sRavelInstance].kvstore.on('connect', this.emit.bind(this, 'connect'));
    if (this[sRavelInstance].kvstore.connected) {
      this.emit('connect');
    }
    this[sRavelInstance].kvstore.on('error', this.emit.bind(this, 'error'));
    this[sRavelInstance].kvstore.on('end', this.emit.bind(this, 'end'));
    this[sRavelInstance].kvstore.on('end', this.emit.bind(this, 'disconnect')); // For backwards compatibility
    this[sRavelInstance].kvstore.on('connect', this.emit.bind(this, 'connect'));
    this[sRavelInstance].kvstore.on('reconnecting', this.emit.bind(this, 'reconnecting'));
    this[sRavelInstance].kvstore.on('ready', this.emit.bind(this, 'ready'));
    this[sRavelInstance].kvstore.on('warning', this.emit.bind(this, 'warning'));
  }

  get connected () {
    return this[sRavelInstance].kvstore.connected;
  }

  get (sid) {
    return new Promise((resolve, reject) => {
      this[sRavelInstance].kvstore.get(sid, (err, res) => {
        if (err) {
          return reject(err);
        } else if (res !== null && res !== undefined) {
          return resolve(JSON.parse(res));
        } else {
          return resolve(res);
        }
      });
    });
  }

  set (sid, sess, ttl) {
    return new Promise((resolve, reject) => {
      if (typeof ttl === 'number') {
        ttl = Math.ceil(ttl / 1000);
      }
      const jsess = JSON.stringify(sess);
      if (ttl !== undefined) {
        this[sRavelInstance].kvstore.setex(sid, ttl, jsess, finishBasicPromise(resolve, reject));
      } else {
        this[sRavelInstance].kvstore.set(sid, jsess, finishBasicPromise(resolve, reject));
      }
    });
  }

  destroy (sid) {
    return new Promise((resolve, reject) => {
      this[sRavelInstance].kvstore.del(sid, finishBasicPromise(resolve, reject));
    });
  }

  quit () {
    // Do nothing. We'll let ravel manage its own redis connection - we're just borrowing it.
  }

  end () {
    this.quit();
  }
}

module.exports = RedisSessionStore;
