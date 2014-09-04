/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */
var prototype = require('prototype');  
Object.extend(global, prototype);
var ApplicationError = require('./application_error');
var l = require('./log')('injector.js');

/**
 * @param {Object} Ravel a reference to the current Ravel
 * @param {Array} moduleFactories a list of registered module factories which haven't yet been instantiated
 * @param {Object} requireModule the module to run require()s relative to, if a client tries to inject an NPM dependency
 */
module.exports = function(Ravel, moduleFactories, requireModule) {
	return {
		inject: function(moduleMap, injectionFunction) {
			moduleMap['$E'] = ApplicationError;

			var requestedModules = injectionFunction.argumentNames();
			var args = [];
			for (var i=0;i<requestedModules.length;i++) {
				if (moduleMap[requestedModules[i]]) {
					//if the requested module is in our map of predefined valid stuff
					args.push(moduleMap[requestedModules[i]]);
				} else if (moduleFactories[requestedModules[i]]) {
					//if the requested module is a registered module
					args.push(Ravel.modules[requestedModules[i]]);
				} else {
					try {
						var requiredModule = requireModule.require(requestedModules[i]);
						args.push(requiredModule);
					} catch (e) {						
						throw new ApplicationError.NotFound('Unable to inject requested module \'' + requestedModules[i] + '\'. If it is one of your modules, make sure you register it with Ravel.module before running Ravel.start. If it is an NPM dependency, make sure it is in your package.json and that it has been installed via $ npm install.');
					}
				}
			}
			injectionFunction.apply(injectionFunction, args);
		}
	};
};