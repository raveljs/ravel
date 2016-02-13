'use strict';

module.exports = {
  // structures
  params: Symbol('_params'),
  knownParameters: Symbol('_knownParamters'),
  modules: Symbol('_modules'),
  moduleFactories: Symbol('_moduleFactories'),
  resourceFactories: Symbol('_resourceFactories'),
  routesFactories: Symbol('_routesFactories'),

  // methods
  loadParameters: Symbol('_loadParameters()'),
  moduleInit:  Symbol('_moduleInit'),
  resourceInit:  Symbol('_resourceInit'),
  routesInit:  Symbol('_routesInit'),

  // objects
  injector: Symbol('Injector')
};
