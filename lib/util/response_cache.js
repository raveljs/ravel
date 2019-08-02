'use strict';
const sRavelInstance = Symbol.for('_ravelInstance');

const defaultOptions = {
  expire: null
};

/**
   * Koa Middleware which caches the body, lastModified, etag, etc.
   * Of a request in redis for a specified amount of time (or indefinitely).
   * If cached, the response will be retrieved from the cache rather than
   * executing the next element in the middleware chain.
   * Borrowed heavily from https://github.com/coderhaoxin/koa-redis-cache.
   *
   * @private
   */
class ResponseCacheMiddleware {
  /**
   * Creates an instance of Cache.
   *
   * @param {Ravel} ravelInstance - An instance of a Ravel app.
   * @private
   */
  constructor (ravelInstance) {
    this[sRavelInstance] = ravelInstance;
  }

  /**
   * Wraps setex in a Promise.
   *
   * @param {string} key - The key to set.
   * @param {number | undefined} expiry - The expiry time (optional).
   * @param {string | Buffer} body - The value.
   * @private
   */
  setex (key, expiry, body) {
    return new Promise((resolve, reject) => {
      const cb = (err, result) => {
        if (err) {
          this[sRavelInstance].$log.error('Could not cache response.', err.stack);
          return reject(new Error('Could not cache response'));
        }
        resolve(result);
      };
      typeof expiry === 'number'
        ? this[sRavelInstance].$kvstore.setex(key, expiry, body, cb) : this[sRavelInstance].$kvstore.set(key, body, cb);
    });
  }

  /**
   * Wraps get in a Promise.
   *
   * @param {string} key - The key to get.
   * @private
   */
  get (key) {
    return new Promise((resolve, reject) => {
      this[sRavelInstance].$kvstore.get(key, (err, result) => {
        if (err || result === null) {
          this[sRavelInstance].$log.trace(`Could not get cached response for key ${key}`);
          return reject(new Error(`Could not get cached response for key ${key}`));
        }
        resolve(result);
      });
    });
  }

  /**
   * Populates a response from the cache, if possible, and resolves.
   * Rejects if there is no cached response, or if something goes wrong.
   *
   * @param {Context} ctx - A koa context.
   * @param {string} key - The key which should contain the response body cache.
   * @param {string} metaKey - The key which should contain the response metadata cache.
   * @returns {Promise} Resolves if the response was successfully populated. Rejects otherwise.
   * @private
   */
  async getFromCache (ctx, key, metaKey) {
    const value = await this.get(key); // this will throw if the value is missing
    ctx.response.status = 200;
    const metadata = JSON.parse(await this.get(metaKey));
    ctx.response.type = metadata.type;
    if (metadata.lastModified) ctx.response.lastModified = metadata.lastModified;
    ctx.response.set(metadata.headers);
    ctx.response.set('X-Ravel-Cache', 'true');
    ctx.response.body = value;
  }

  /**
   * Caches a response body and metadata in Redis.
   *
   * @param {Context} ctx - A koa context.
   * @param {string} key - The key which should contain the response body cache.
   * @param {string} metaKey - The key which should contain the response metadata cache.
   * @param {object} options - Options, such as the cache expiry.
   * @returns {Promise} Resolves if the response was successfully populated. Rejects otherwise.
   * @private
   */
  async cacheBody (ctx, key, metaKey, options) {
    let body = ctx.response.body;
    if ((ctx.request.method !== 'GET') || (ctx.response.status !== 200) || !body) {
      return;
    }
    if (typeof body === 'string') {
      // string
      if (Buffer.byteLength(body) > options.maxLength) return;
      await this.setex(key, options.expire, body);
    } else if (Buffer.isBuffer(body)) {
      // buffer
      if (body.length > options.maxLength) return;
      await this.setex(key, options.expire, body);
    } else if (typeof body === 'object' && ctx.response.type === 'application/json') {
      // json
      body = JSON.stringify(body);
      if (Buffer.byteLength(body) > options.maxLength) return;
      await this.setex(key, options.expire, body);
    } else if (typeof body.pipe === 'function') {
      this[sRavelInstance].$log.warn('@cache does not currently support streamed bodies.');
      return;
    } else {
      return;
    }
    const meta = {
      type: ctx.response.type,
      lastModified: ctx.response.lastModified || null,
      headers: ctx.response.headers
    };
    await this.setex(metaKey, options.expire, JSON.stringify(meta));
  }

  /**
   * Configurablel middleware for caching responses and re-serving them.
   *
   * @param {object} inOptions - Options for configuring the caching middleware.
   * @returns {AsyncFunction} The caching middleware.
   * @private
   */
  middleware (inOptions) {
    let options = Object.create(null);
    options = Object.assign(options, defaultOptions);
    options = Object.assign(options, inOptions);
    return async (ctx, next) => {
      const key = `ravel-cache-${ctx.request.method}-${ctx.request.url}`;
      const metaKey = key + ':type';
      try {
        await this.getFromCache(ctx, key, metaKey);
      } catch (e) {
        await next();
        try {
          await this.cacheBody(ctx, key, metaKey, options);
        } catch (e2) {
          this[sRavelInstance].$log.error(e2);
        }
      }
    };
  }
}

module.exports = ResponseCacheMiddleware;
