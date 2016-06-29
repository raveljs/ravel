'use strict';

const ApplicationError = require('../util/application_error');

const sProviders = Symbol.for('_databaseProviders');
const sName = Symbol.for('_sName');

/**
 * Defines an abstract DatabaseProvider - a mechanism
 * by which connections can be obtained and transactions
 * can be entered and exited for a particular database
 * provider such as MySQL (see ravel-mysql-provider for an
 * example implementation).
 */
class DatabaseProvider {

  /**
   * Anything that should happen when this `DatabaseProvider` is connected to a
   * Ravel application via `require('provider-name')(app)` should happen here.
   * This includes, but is not limited to, the declaration of parameters supporting
   * this module via `ravelInstance.registerParameter()`. If you override this constructor,
   * be sure to call `super(ravelInstance, name)`!
   * @param {Ravel} ravelInstance an instance of a Ravel application
   * @param {String} name a unique name for this `DatbaseProvider`. A default can
   *                      be provided by overriding this constructor and using
   *                      ES2015 default argument value syntax. Must be unique within
   *                      your application.
   */
  constructor(ravelInstance, name) {
    this[sName] = name;
    this.log = ravelInstance.log.getLogger(this.name);

    ravelInstance.once('pre listen', () => {
      ravelInstance.log.debug(`Using ${this.constructor.name}, alias: ${this.name}`);
      try {
        this.prelisten(ravelInstance);
      } catch (err) {
        // EventEmitter swallows error otherwise
        ravelInstance.emit('error', err);
      }
    });

    ravelInstance.once('end', () => {
      ravelInstance.log.debug(`Shutting down ${this.constructor.name}, alias: ${this.name}`);
      this.end(ravelInstance);
    });

    if (!ravelInstance[sProviders]) {
      ravelInstance[sProviders] = [];
    }

    ravelInstance[sProviders].push(this);
  }

  /**
   * @return {String} The unique name of this DatabaseProvider.
   *                  Try to pick something unique within the Ravel ecosystem.
   */
  get name() {
    return this[sName];
  }

  /**
   * Anything that should happen just before a Ravel application starts listening
   * (`app.listen()`) should happen here. If you override this hook, be sure to call `super()`!
   * This function should return nothing. It is a good place to start connection
   * [pools](https://github.com/coopernurse/node-pool).
   * @param {Ravel} ravelInstance an instance of a Ravel application
   */
  prelisten(ravelInstance) { } //eslint-disable-line no-unused-vars

  /**
   * Anything that should happen just before a Ravel application stops listening
   * (`app.end()`) should happen here. If you override this hook, be sure to call `super()`!
   * This function should return nothing.
   * @param {Ravel} ravelInstance an instance of a Ravel application
   */
  end(ravelInstance) { } //eslint-disable-line no-unused-vars

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

/*!
 * Export accessor for `DatabaseProvider`s list
 */
module.exports = function(Ravel) {
  Ravel.prototype.databaseProviders = function() {
    return this[sProviders] ? this[sProviders] : [];
  };
};

/*!
 * Export the `DatabseProvider` superclass
 */
module.exports.DatabaseProvider = DatabaseProvider;
