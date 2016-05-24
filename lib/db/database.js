'use strict';

const co = require('co');
const koaCompose = require('koa-compose');

const sRavelInstance = Symbol.for('_ravelInstance');
const sOpenConnections = Symbol.for('_openConnections');
const sCloseConnections = Symbol.for('_closeConnections');

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
  }

  /**
   * Koa Middleware which populates a request object with
   * an open transaction for all configured database providers.
   * This transaction will be automatically rolled back or committed
   * when the response is finished (if the given provider suports
   * rollbacks).
   *
   * @param {Array[String | undefined} providerNames the names of which providers
   *                                                 to open connections for. Optional.
   *
   */
  middleware(...providerNames) {
    const self = this;
    return function*(next) {
      const closers = [];
      this.transaction = yield self[sOpenConnections](providerNames, closers);
      //try yielding to next middleware and committing statements afterwards. Rollback if there was an error
      try {
        yield next;
        yield self[sCloseConnections](closers, true);
      } catch (err) {
        try {
          yield self[sCloseConnections](closers, false);
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
   * @param {Array} args Arguments beginning with 0-N Strings representing providers to open connections on,
   *                     followed by a generator function which Will be provided with a context which contains
   *                     this.transaction
   * @return {Promise} which is resolved when inGen is finished running, or rejected if
   *                   an error was thrown.
   */
  scoped(...args) {
    let scope = args[args.length-1];
    let provs = args.slice(0, args.length-1);

    let ctx = Object.create(null);
    const stack = [
      this.middleware(...provs),
      scope
    ];

    return co.wrap(koaCompose(stack)).call(ctx);
  }
}

/**
 * Private function for opening all transactional connections
 * to the registered database providers.
 * @param {Array[String} providerNames the names of which providers to open connections for. If empty, all connections
 *                                     will be opened.
 * @param {Array} closers a place to put connection closing closures
 *
 */
TransactionFactory.prototype[sOpenConnections] = function(providerNames, closers) {
  return new Promise((resolve, reject) => {
    const providers = this[sRavelInstance].get('database providers');
    if (providers.length === 0) {
      this[sRavelInstance].log.debug('Middleware transaction attempted, but no database providers are registered.');
      // resolve with no connections
      resolve(Object.create(null));
    } else {
      const sConnName = Symbol.for('name');
      const toOpen = providerNames.length === 0 ? providers : providers.filter(p => providerNames.indexOf(p.name) >= 0);
      // index provider promises in an array and use co to open connections.
      co(function*() {
        return yield toOpen.map(p =>  {
          return p.getTransactionConnection()
          // chain an extra then() on the end, which will store connection closing functions
          // which will allow us to clean up if one of the opens fails.
          .then((conn) => {
            closers.push((shouldCommit) =>  {
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
        this[sCloseConnections](closers, false);
        reject(err);
      });
    }
  });
};

/**
 * Private function for closing all open transactional connections
 * @param {Array} closers a place to put connection-closing closures
 * @param {Boolean} shouldCommit whether or not to commit the transaction
 */
TransactionFactory.prototype[sCloseConnections] = function(closers, shouldCommit) {
  return Promise.all(closers.map(closer => {
    return closer(shouldCommit);
  })).catch((err) => {
    throw err;
  });
};

/**
 * Populates a `ravel instance` with a TransactionFactory
 */
module.exports = function(ravelInstance) {

  ravelInstance.registerParameter('always rollback transactions', false);

  return new TransactionFactory(ravelInstance);
};
