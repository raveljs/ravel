'use strict';
/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */

/**
 * Defines an abstract DatabaseProvider - a mechanism
 * by which connections can be obtained and transactions
 * can be entered and exited for a particular database
 * provider such as MySQL (see db/mysql.js for an
 * example implementation).
 */
module.exports = function(Ravel) {
  Ravel.DatabaseProvider = function(name) {
  	/**
  	 * The name of the DatabaseProvider
  	 */
    this.name = name;

    /**
     * Obtain a connection and start a transaction
     * 
     * @param callback {Function} callback(err, connection)
     */
    this.getTransactionConnection = function() {
      throw new Ravel.ApplicationError.NotImplemented('DatabaseProvider ' + this.name + ' must implement getTransactionConnection(callback)');
    };

    /**
     * End a transaction depending on finalErr and close the connection.
     * Rollback the transaction iff finalErr !== null.
     *
     * @param connection {Object} A connection object which was used throughout the transaction
     * @param finalErr {Error | null} The error supplied by the final API method called in the transaction, if any
     * @param callback {Function} callback(exitErr)
     */
    this.exitTransaction = function() {
      throw new Ravel.ApplicationError.NotImplemented('DatabaseProvider ' + this.name + ' must implement exitTransaction(connection, finalErr, callback)');
    };
    return this;
  };
};