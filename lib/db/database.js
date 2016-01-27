'use strict';

/**
 * Multi-database transaction handling via function scopes and Express middleware
 */
const async = require('async');
const httpCodes = require('../util/http_codes');

module.exports = function(ravelInstance) {

  ravelInstance.registerSimpleParameter('always rollback transactions', false);

  const providers = ravelInstance.get('database providers');

  /**
   * ExpressJS Middleware which populates a request object with
   * an open transaction for all configured database providers.
   * This transaction will be automatically rolled back or committed
   * when the response is finished.
   */
  const middlewareTransaction = function() {
    return function(req, res, next) {
      if (providers.length === 0) {
        ravelInstance.Log.debug('Middleware transaction attempted, but no database providers are registered.');
        req.transaction = {};
        next();
      } else {
        const starters = {},
            enders = [];

        //obtain starter function for each transaction provider
        const getStarter = function(p) {
          return function(next) {
            p.getTransactionConnection(next);
          };
        };
        //build a dictionary of starter functions by provider name
        for (let i=0;i<providers.length;i++) {
          starters[providers[i].name] = getStarter(providers[i]);
        }

        //use async.series to construct a dictionary of open connections
        //or to catchall fail if the opening of any one of those
        //connections is unsuccessful
        async.series(starters, function(connectionErr, connections) {
          if (connectionErr) {
            ravelInstance.Log.error('Unable to start transaction.', connectionErr);
            //write a failure response immediately
            res.status(httpCodes.INTERNAL_SERVER_ERROR).end();
          } else {
            //if we were successful in opening connections tweak request
            //object so that following middleware can use the transaction
            req.transaction = connections;

            //obtain ender function for each transaction provider
            const getEnder = function(p, shouldCommit) {
              return function(next) {
                p.exitTransaction(connections[p.name], shouldCommit, next);
              };
            };
            //build transaction exit function
            const exitTransaction = function(shouldCommit, callback) {
              delete req.transaction;
              for (let j=0;j<providers.length;j++) {
                enders.push(getEnder(providers[j], shouldCommit));
              }
              async.parallel(enders, function(endErr) {
                if (endErr) {
                  ravelInstance.Log.error('Unable to end transaction.', endErr);
                  callback(endErr, null);
                } else {
                  callback(null, null);
                }
              });
            };
            //override all response-ending express methods so that they close
            //the transaction
            const buildOverrideEnder = function(fToOverride) {
              return function(body) {
                if (req.transaction) {
                  const shouldCommit = !ravelInstance.get(
                    'always rollback transactions') && res.statusCode >= 200 && res.statusCode < 300;
                  exitTransaction(shouldCommit, function(exitErr) {
                    if (exitErr) {
                      res.status(httpCodes.INTERNAL_SERVER_ERROR).end();
                    } else {
                      fToOverride.apply(res, [body]);
                    }
                  });
                } else {
                  fToOverride.apply(res, [body]);
                }
              };
            };
            //all express response methods (send, json, jsonp) go through end()
            res.end = buildOverrideEnder(res.end);
            res.sendStatus = function(status) {
              res.status(status);
              res.end();
            };

            //tweak the response object so that the end of the middleware
            //chain will automatically close the transaction
            next();
          }
        });
      }
    };
  };

  /**
   * For use when middlewareTransaction can't be used (in other words,
   * outside of a Resource). Currently this version can only be injected
   * into ravel's 'get user function' and 'get or create user function'.
   *
   * @param onSuccess {Function} function(transaction, exit) A scope for the transaction.
   *                              exit is a function which can end the transaction, and
   *                              automatically calls the actualCallback when it's done.
   * @param actualCallback {Function} function(err, result) Should never be called once
   *                                                        passed to this
   *
   */
  const scopedTransaction = function(onSuccess, actualCallback) {
    if (providers.length === 0) {
      ravelInstance.Log.debug('Scoped transaction attempted, but no database providers are registered.');
      onSuccess({}, function(){});
    } else {
      const starters = {},
            enders = [];

      //obtain starter function for each transaction provider
      const getStarter = function(p) {
        return function(next) {
          p.getTransactionConnection(next);
        };
      };
      //build a dictionary of starter functions by provider name
      for (let i=0;i<providers.length;i++) {
        starters[providers[i].name] = getStarter(providers[i]);
      }

      //use async.series to construct a dictionary of open connections
      //or to catchall fail if the opening of any one of those
      //connections is unsuccessful
      async.series(starters, function(connectionErr, connections) {
        if (connectionErr) {
          ravelInstance.Log.error('Unable to start transaction.', connectionErr);
          if (actualCallback) {
            actualCallback(connectionErr);
          }
        } else {
          //obtain ender function for each transaction provider
          const getEnder = function(p, shouldCommit) {
            return function(next) {
              p.exitTransaction(connections[p.name], shouldCommit, next);
            };
          };
          //build transaction exit function
          const exitTransaction = function(err, result) {
            const shouldCommit = !ravelInstance.get('always rollback transactions') &&
              (err === undefined || err === null);
            for (let j=0;j<providers.length;j++) {
              
              enders.push(getEnder(providers[j], shouldCommit));
            }
            async.parallel(enders, function(endErr) {
              if (endErr) {
                ravelInstance.Log.error('Unable to end transaction.', endErr);
                if (actualCallback) {
                  actualCallback(endErr, null);
                }
              } else if (actualCallback) {
                actualCallback(err, result);
              }
            });
          };
          //open onSuccess with transaction and exit function
          onSuccess(connections, exitTransaction);
        }
      });
    }
  };

  //allow scoped transactions to be created programmatically
  ravelInstance.$ScopedTransaction = {
    enter: scopedTransaction
  };

  //We wrap scopedTransaction and middlewareTransaction
  //as 'enter' within an objet for nicer semantics
  return {
    scoped: {
      enter: scopedTransaction
    },
    middleware: {
      enter: middlewareTransaction
    },
  };
};
