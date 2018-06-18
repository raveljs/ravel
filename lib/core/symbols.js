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
  routes: Symbol.for('_routes'),
  resource: Symbol.for('_resource'),
  middleware: Symbol.for('_middleware'),
  moduleFactories: Symbol.for('_moduleFactories'),
  resourceFactories: Symbol.for('_resourceFactories'),
  routesFactories: Symbol.for('_routesFactories'),
  endpoints: Symbol.for('_endpoints'),
  knownComponents: Symbol.for('_knownComponents'),
  // methods
  loadParameters: Symbol.for('_loadParameters()'),
  validateParameters: Symbol.for('_validateParameters()'),
  parametersLoaded: Symbol.for('_parametersLoaded()'),
  loadModule: Symbol.for('_loadModule'),
  moduleInit: Symbol.for('_moduleInit'),
  loadRoutes: Symbol.for('_loadRoutes'),
  routesInit: Symbol.for('_routesInit'),
  loadResource: Symbol.for('_loadResource'),
  resourceInit: Symbol.for('_resourceInit'),
  registerClassFunc: Symbol.for('_registerClassFunc'),

  // objects
  injector: Symbol.for('Injector'),
  websocketBroker: Symbol.for('_websocketBroker')
};
