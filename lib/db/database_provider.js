
'use strict';
const ApplicationError = require('../util/application_error');

const sInit = Symbol.for('_init');

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
   * @param {Object} connection A connection object which was used throughout the transaction
   * @param {Boolean} shouldCommit If true, commit, otherwise rollback
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
  this.log = ravelInstance.log.getLogger(this.name);
};

/**
 * Export the DatabseProvider superclass
 */
module.exports.DatabaseProvider = DatabaseProvider;

/**
 * Export initializer for all registered DatabaseProviders
 */
module.exports.init = function() {
  const providers = this.get('database providers');

  for (let p of providers) {
    p[sInit](this);
  }
};
