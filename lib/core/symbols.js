'use strict';

/**
 * Defines Symbols for core/, concealing private variables shared between Ravel source files
 */
module.exports = {
  // structures
  params: Symbol('_params'),
  knownParameters: Symbol('_knownParamters'),
  modules: Symbol('_modules'),
  moduleFactories: Symbol('_moduleFactories'),
  resourceFactories: Symbol('_resourceFactories'),
  routesFactories: Symbol('_routesFactories'),
  knownClasses: Symbol('_knownClasses'),

  // methods
  loadParameters: Symbol('_loadParameters()'),
  moduleInit:  Symbol('_moduleInit'),
  resourceInit:  Symbol('_resourceInit'),
  routesInit:  Symbol('_routesInit'),
  routesInitFunc: Symbol('_routesInitFunc'),
  registerClassFunc: Symbol('_registerClassFunc'),

  // objects
  injector: Symbol('Injector')
};
