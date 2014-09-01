/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */
var l = require('./log')("database.js");
var ApplicationError = require('./application_error');
var mysql = require('mysql');

module.exports = function(Ravel) {
  var pool  = mysql.createPool({
    host     : Ravel.get('mysql host'),
    port     : Ravel.get('mysql port'),
    user     : Ravel.get('mysql user'),
    password : Ravel.get('mysql password'),
    database : Ravel.get('mysql database name'),
    connectionLimit : Ravel.get('mysql connection pool size'),
    supportBigNumbers : true
  });

  function handleDisconnect(connection) {
    connection.on('error', function(err) {
      if (!err.fatal) {
        return;
      }

      if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
        throw err;
      }

      l.w('Re-connecting lost connection: ' + err.stack);

      connection = pool.getConnection();
      handleDisconnect(connection); //FIXME infinite recursion?
      connection.connect();    
    });
  };
  
  var DB = {};

  var getConnection = function(callback) {
    pool.getConnection(function(err, connection) {
      if (!err) {
        //handleDisconnect(connection);
      }
      callback(err, connection);
    });
  };

  //Get a connection which also opens a transaction
  var getTransactionConnection = function(callback) {
    pool.getConnection(function(connectionErr, connection) {
      if (connectionErr) {
        callback(connectionErr, null);
      } else {
        connection.beginTransaction(function(transactionErr) {
          if (transactionErr) {
            callback(transactionErr, null);
            connection.release();
          } else {
            callback(transactionErr, connection);
          }
        });
      }
    });
  };

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
   *                              connection as its second argument
   * @returns {Function} transaction entry point version of transactionalFunction
   */
  var createTransactionEntryPoint = function(transactionalFunction) {
      return function() {
          var argsArray = Array.prototype.slice.call(arguments);
          var callback = argsArray[argsArray.length-1];
          getTransactionConnection(function(connectionErr, connection) {
              if (connectionErr) {
                  callback(connectionErr, null);
              } else {
                  argsArray.splice(0,0,connection);
                  argsArray[argsArray.length-1] = function(actualErr, result) {
                    if (actualErr) {
                      connection.rollback(function() {
                        connection.release();
                        l.e(actualErr);
                        callback(actualErr, null);
                      });
                    } else {
                      connection.commit(function(commitErr) {
                        if (commitErr) {
                          connection.rollback(function(){
                            connection.release();
                            l.e(commitErr);
                            callback(commitErr, null);
                          });
                        } else {
                          connection.release();
                          callback(actualErr, result);
                        }
                      });
                    }
                  };
                  transactionalFunction.apply(transactionalFunction, argsArray);
              }
          });
      };
  };


  /**
   * Wraps all the transactional functions (prefixed by t) in a
   * particular module using createTransactionEntryPoint
   * @param moduleExports
   */
  DB.createTransactionEntryPoints = function(moduleExports) {
      for (var key in moduleExports) {
          if (key[0] === 't') {
              var transactionEntryPointName = key.slice(1,key.length);
              transactionEntryPointName = transactionEntryPointName[0].toLowerCase() + transactionEntryPointName.slice(1,transactionEntryPointName.length);
              moduleExports[transactionEntryPointName] = createTransactionEntryPoint(moduleExports[key]);
          }
      }
  };
  
  return DB;
};
