'use strict';

/**
 * Multi-database transaction handling via function scopes and koa middleware
 */
const co = require('co');
const genbind = require('generator-bind');

class TransactionFactory {
  constructor(ravelInstance) {
    this._ravelInstance = ravelInstance;
    this._closers = [];
  }

  _openConnections() {
    return new Promise((resolve, reject) => {
      const providers = this._ravelInstance.get('database providers');
      if (providers.length === 0) {
        this._ravelInstance.Log.debug('Middleware transaction attempted, but no database providers are registered.');
        // resolve with no connections
        resolve(Object.create(null));
      } else {
        const self = this;
        // index provider promises in an array and use co to open connections.
        co(function*() {
          return yield providers.map(p =>  {
            return p.getTransactionConnection()
            // chain an extra then() on the end, which will store connection closing functions
            // which will allow us to clean up if one of the opens fails.
            .then((conn) => {
              self._closers.push((shouldCommit) =>  {
                return p.exitTransaction(conn, shouldCommit);
              });
              conn._name = p.name; // store name in promise for later
              return conn;
            });
          });
        }).then((connections) =>{
          // convert array into map with provider names
          const connObj = Object.create(null);
          for (let c of connections) {
            connObj[c._name] = c;
          }
          resolve(connObj);
        }).catch((err) => {
          this._closeConnections(false);
          reject(err);
        });
      }
    });
  }

  _closeConnections(shouldCommit) {
    return Promise.all(this._closers.map(closer => {
      return closer(shouldCommit);
    })).catch((err) => {
      throw err;
    });
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
      const connections = yield self._openConnections();
      this.transaction = connections;
      //try yielding to next middleware and committing statements afterwards. Rollback if there was an error
      try {
        yield next;
        yield self._closeConnections(true);
      } catch (err) {
        try {
          yield self._closeConnections(false);
        } finally {
          throw err;
        }
      }
    };
  }

  /**
   * For use when middlewareTransaction can't be used (in other words,
   * outside of a Resource).
   *
   * @param inGen {Generator} Similar to koa middleware. Will be provided
   *                          with a context which contains this.transaction
   */
  scoped(inGen) {
    const ctx = {};
    genbind(ctx, inGen);
  }
}

module.exports = function(ravelInstance) {

  ravelInstance.registerSimpleParameter('always rollback transactions', false);

  //allow scoped transactions to be created programmatically
  // ravelInstance.ScopedTransaction = new ScopedTransaction(ravelInstance);

  const tf = new TransactionFactory(ravelInstance);

  class Transactions {
    static get scoped() {
      return ravelInstance.ScopedTransaction;
    }
    static get middleware() {
      return tf.middleware();
    }
  }

  return Transactions;
};
