'use strict';

/**
 * Defines Symbols for core/, concealing private variables shared between Ravel source files
 *
 * @private
 */
module.exports = {
  // structures
  params: Symbol.for('_params'),
  knownParameters: Symbol.for('_knownParamters'),
  modules: Symbol.for('_modules'),
  middleware: Symbol.for('_middleware'),
  moduleFactories: Symbol.for('_moduleFactories'),
  resourceFactories: Symbol.for('_resourceFactories'),
  routesFactories: Symbol.for('_routesFactories'),
  endpoints: Symbol.for('_endpoints'),
  knownClasses: Symbol.for('_knownClasses'),

  // methods
  loadParameters: Symbol.for('_loadParameters()'),
  validateParameters: Symbol.for('_validateParameters()'),
  parametersLoaded: Symbol.for('_parametersLoaded()'),
  loadModule: Symbol.for('_loadModule'),
  moduleInit: Symbol.for('_moduleInit'),
  resourceInit: Symbol.for('_resourceInit'),
  routesInit: Symbol.for('_routesInit'),
  routesInitFunc: Symbol.for('_routesInitFunc'),
  registerClassFunc: Symbol.for('_registerClassFunc'),

  // objects
  injector: Symbol.for('Injector')
};
