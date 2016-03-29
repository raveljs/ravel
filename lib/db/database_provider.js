
'use strict';
const ApplicationError = require('../util/application_error');
const symbols = require('./symbols');

const sInit = Symbol('_init');

/**
 * Defines an abstract DatabaseProvider - a mechanism
 * by which connections can be obtained and transactions
 * can be entered and exited for a particular database
 * provider such as MySQL (see ravel-mysql-provider for an
 * example implementation).
 */
class DatabaseProvider {
  /**
   * @param name The unique name of this DatabaseProvider
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Obtain a connection and start a transaction
   *
   * @return {Promise} resolved by the open connection
   */
  getTransactionConnection() {  //eslint-disable-line no-unused-vars
    return Promise.reject(new ApplicationError.NotImplemented(
      'DatabaseProvider ' + this.name + ' must implement getTransactionConnection()'));
  }

  /**
   * End a transaction and close the connection.
   * Rollback the transaction iff finalErr !== null.
   *
   * @param connection {Object} A connection object which was used throughout the transaction
   * @param shouldCommit {Boolean} If true, commit, otherwise rollback
   * @return {Promise} resolved, or rejected if there was an error while closing the connection.
   */
  exitTransaction(connection, shouldCommit) {  //eslint-disable-line no-unused-vars
    return Promise.reject(new ApplicationError.NotImplemented(
      'DatabaseProvider ' + this.name + ' must implement exitTransaction(connection, shouldCommit)'));
  }
}

/**
 * Called internally by Ravel to initialize all registered DatabaseProviders
 */
DatabaseProvider.prototype[sInit] = function(ravelInstance) {
  this.log = ravelInstance.Log.getLogger(this.name);
};

/**
 * Populates Ravel class with the DatabaseProvider superclass, as well as an init method for all
 * registered DatabaseProviders
 */
module.exports = function(Ravel) {
  // Ravel should provide DatabaseProvider superclass statically
  Ravel.DatabaseProvider = DatabaseProvider;

  /**
   * Performs database provider initialization in
   * Ravel.init()
   */
  Ravel.prototype[symbols.databaseProviderInit] = function() {
    const providers = this.get('database providers');

    for (let p of providers) {
      p[sInit](this);
    }
  };
};
