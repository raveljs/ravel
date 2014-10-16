'use strict';
/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */
var async = require('async');

module.exports = function(Ravel) {

  var DB = {};

  var transactionStartToken = Math.random();
  DB.transactionCreator = {
    enter: function() { 
      return transactionStartToken; 
    }
  };

  var providers = Ravel.get('database providers');
  if (providers.length === 0) {
    throw new Ravel.ApplicationError.IllegalValue('Unable to start application. No database provider specified!');
  }

  /**
   * Wraps a function expecting a database connection as its
   * second argument to produce another function which does
   * not have this requirement. This creates a version of the
   * function which will create its own database connection
   * and initiate a transaction, as well as rollback or
   * commit it based on the final callback of the
   * transactionalFunction.
   *
   * @param transactionalFunction the function to wrap. must take a database
   *                              connection as its first argument
   * @returns {Function} transaction entry point version of transactionalFunction
   */
  DB.createTransactionEntryPoint = function(transactionalFunction) {
    return function() {
      var argsArray = Array.prototype.slice.call(arguments);
      //if a connection isn't supplied, create one
      if (argsArray[0] === transactionStartToken) {
        var callback = argsArray[argsArray.length-1], 
            starters = {},
            enders = [];
        //start transactions for all providers
        var start = function(p) {
          return function(next) {
            p.getTransactionConnection(next);
          };
        };
        for (var i=0;i<providers.length;i++) {
          starters[providers[i].name] = start(providers[i]);
        }        
        async.series(starters, function(connectionErr, connections) {
          if (connectionErr) {
            callback(connectionErr, null);
          } else {
            //replace first argument with connections structure
            argsArray[0] = connections;
            //replace last argument with a special callback that
            //will close or rollback the transaction for each 
            //open connection based on a standard node 
            //callback (err, result)
            var end = function(p, actualErr) {
              return function(next) {
                p.exitTransaction(connections[p.name], actualErr, next);
              };
            };
            argsArray[argsArray.length-1] = function(actualErr, actualResponse) {
              for (var j=0;j<providers.length;j++) {
                enders.push(end(providers[j], actualErr));
              }
              async.parallel(enders, function(endErr) {
                if (endErr) {
                  callback(endErr, null);
                } else {
                  callback(actualErr, actualResponse);
                }
              });
            };
            transactionalFunction.apply(transactionalFunction, argsArray);
          }
        });
      } else {
        transactionalFunction.apply(transactionalFunction, argsArray);
      }
    };
  };
  
  return DB;
};
