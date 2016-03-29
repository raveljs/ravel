'use strict';

const co = require('co');
const compose = require('composition');

const sRavelInstance = Symbol('_ravelInstance');
const sClosers = Symbol('_closers');
const sOpenConnections = Symbol('_openConnections');
const sCloseConnections = Symbol('_closeConnections');

/**
 * Database transaction support for `ravel` applications provided in two ways:
 *  - Koa middlware (transaction-per-request): Will open and close connections
 *    automatically and manage rollbacks when errors are thrown.
 *  - Scoped transaction: For use outside of the context of an explicit web route.
 *    Useful for tasks such as passport.js init and application init.
 */
class TransactionFactory {
  /**
   * @param {Object} ravelInstance an instance of a Ravel app
   */
  constructor(ravelInstance) {
    this[sRavelInstance] = ravelInstance;
    this[sClosers] = [];
  }

  /**
   * Koa Middleware which populates a request object with
   * an open transaction for all configured database providers.
   * This transaction will be automatically rolled back or committed
   * when the response is finished.
   */
  middleware() {
    const self = this;
    return function*(next) {
      this.transaction = yield self[sOpenConnections]();
      //try yielding to next middleware and committing statements afterwards. Rollback if there was an error
      try {
        yield next;
        yield self[sCloseConnections](true);
      } catch (err) {
        try {
          yield self[sCloseConnections](false);
        } finally {
          throw err;
        }
      }
    };
  }

  /**
   * For use when middlewareTransaction can't be used (in other words,
   * outside of a **Resource**).
   *
   * @param inGen {Generator} Similar to koa middleware. Will be provided
   *                          with a context which contains this.transaction
   * @return {Promise} which is resolved when inGen is finished running, or rejected if
   *                   an error was thrown.
   */
  scoped(inGen) {
    let ctx = Object.create(null);
    const stack = [
      this.middleware(),
      inGen
    ];

    return co.wrap(compose(stack)).call(ctx);
  }
}

/**
 * Private function for opening all transactional connections
 * to the registered database providers.
 */
TransactionFactory.prototype[sOpenConnections] = function() {
  return new Promise((resolve, reject) => {
    const providers = this[sRavelInstance].get('database providers');
    if (providers.length === 0) {
      this[sRavelInstance].Log.debug('Middleware transaction attempted, but no database providers are registered.');
      // resolve with no connections
      resolve(Object.create(null));
    } else {
      const self = this;
      const sConnName = Symbol('name');
      // index provider promises in an array and use co to open connections.
      co(function*() {
        return yield providers.map(p =>  {
          return p.getTransactionConnection()
          // chain an extra then() on the end, which will store connection closing functions
          // which will allow us to clean up if one of the opens fails.
          .then((conn) => {
            self[sClosers].push((shouldCommit) =>  {
              return p.exitTransaction(conn, shouldCommit);
            });
            conn[sConnName] = p.name; // store name in promise for later
            return conn;
          });
        });
      }).then((connections) =>{
        // convert array into map with provider names
        const connObj = Object.create(null);
        for (let c of connections) {
          connObj[c[sConnName]] = c;
        }
        resolve(connObj);
      }).catch((err) => {
        this[sCloseConnections](false);
        reject(err);
      });
    }
  });
};

/**
 * Private function for closing all open transactional connections
 */
TransactionFactory.prototype[sCloseConnections] = function(shouldCommit) {
  return Promise.all(this[sClosers].map(closer => {
    return closer(shouldCommit);
  })).catch((err) => {
    throw err;
  });
};

/**
 * Populates a `ravel instance` with a TransactionFactory
 */
module.exports = function(ravelInstance) {

  ravelInstance.registerSimpleParameter('always rollback transactions', false);

  return new TransactionFactory(ravelInstance);
};
