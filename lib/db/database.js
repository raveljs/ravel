'use strict';

/**
 * Multi-database transaction handling via function scopes and koa middleware
 */
const co = require('co');
const compose = require('composition');

const _openConnections = Symbol('_openConnections');
const _closeConnections = Symbol('_openConnections');

class TransactionFactory {
  constructor(ravelInstance) {
    this._ravelInstance = ravelInstance;
    this._closers = [];
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
      this.transaction = yield self[_openConnections]();
      //try yielding to next middleware and committing statements afterwards. Rollback if there was an error
      try {
        yield next;
        yield self[_closeConnections](true);
      } catch (err) {
        try {
          yield self[_closeConnections](false);
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

TransactionFactory.prototype[_openConnections] = function() {
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
        this[_closeConnections](false);
        reject(err);
      });
    }
  });
};

TransactionFactory.prototype[_closeConnections] = function(shouldCommit) {
  return Promise.all(this._closers.map(closer => {
    return closer(shouldCommit);
  })).catch((err) => {
    throw err;
  });
};

module.exports = function(ravelInstance) {

  ravelInstance.registerSimpleParameter('always rollback transactions', false);

  return new TransactionFactory(ravelInstance);
};
