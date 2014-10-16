'use strict';

var mysql = require('mysql');

module.exports = function(Ravel) {
  var MySQLProvider = {
    name: 'mysql'
  };

  //register this as a database provider. somewhere in db.
  var providers = Ravel.get('database providers');
  providers.push(MySQLProvider);
  Ravel.set('database providers', providers);

	//mysql parameters
	Ravel.registerSimpleParameter('mysql host', true);
	Ravel.registerSimpleParameter('mysql port', true);
	Ravel.registerSimpleParameter('mysql user', true);
	Ravel.registerSimpleParameter('mysql password', true);
	Ravel.registerSimpleParameter('mysql database name', true);
	Ravel.registerSimpleParameter('mysql connection pool size', true);

  Ravel.on('start', function() {
    Ravel.Log.l('Using mysql database provider');
    var pool  = mysql.createPool({
      host     : Ravel.get('mysql host'),
      port     : Ravel.get('mysql port'),
      user     : Ravel.get('mysql user'),
      password : Ravel.get('mysql password'),
      database : Ravel.get('mysql database name'),
      connectionLimit : Ravel.get('mysql connection pool size'),
      supportBigNumbers : true
    });

    MySQLProvider.getTransactionConnection = function(callback) {
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

    MySQLProvider.exitTransaction = function(connections, actualErr, callback) {
      if (actualErr) {
        connections[MySQLProvider.name].rollback(function(rollbackErr) {
          connections[MySQLProvider.name].release();
          Ravel.Log.e(actualErr);
          callback(rollbackErr, null);
        });
      } else {
        connections[MySQLProvider.name].commit(function(commitErr) {
          if (commitErr) {
            connections[MySQLProvider.name].rollback(function(rollbackErr){
              connections[MySQLProvider.name].release();
              Ravel.Log.e(commitErr);
              callback(rollbackErr?rollbackErr:commitErr, null);
            });
          } else {
            connections[MySQLProvider.name].release();
            callback(null, null);
          }
        });
      }
    };
  });
};