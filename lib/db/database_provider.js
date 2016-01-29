
'use strict';
const ApplicationError = require('../util/application_error');

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

  // Called internally by Ravel
  _init(ravelInstance) {
    this.log = ravelInstance.Log.getLogger(this.name);
  }

  /**
   * Obtain a connection and start a transaction
   *
   * @param callback {Function} callback(err, connection)
   */
  getTransactionConnection(callback) {  //eslint-disable-line no-unused-vars
    throw new ApplicationError.NotImplemented(
      'DatabaseProvider ' + this.name + ' must implement getTransactionConnection(callback)');
  }

  /**
   * End a transaction depending on finalErr and close the connection.
   * Rollback the transaction iff finalErr !== null.
   *
   * @param connection {Object} A connection object which was used throughout the transaction
   * @param shouldCommit {Boolean} If true, commit, otherwise rollback
   * @param callback {Function} callback(exitErr)
   */
  exitTransaction(connection, shouldCommit, callback) {  //eslint-disable-line no-unused-vars
    throw new ApplicationError.NotImplemented(
      'DatabaseProvider ' + this.name + ' must implement exitTransaction(connection, shouldCommit, callback)');
  }
}

module.exports = function(Ravel) {
  // Ravel should provide DatabaseProvider superclass statically
  Ravel.DatabaseProvider = DatabaseProvider;

  /**
   * Performs database provider initialization in
   * Ravel.init()
   */
  Ravel.prototype._databaseProviderInit = function() {
    const providers = this.get('database providers');

    for (let p of providers) {
      p._init(this);
    }
  };
};
