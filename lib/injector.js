var prototype = require('prototype');  
Object.extend(global, prototype);

var ApplicationError = require('./application_error');

module.exports = function(Ravel, moduleFactories) {
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
					console.error('unknown module requested: ' + requestedModules[i]);
					args.push(undefined);
				}
			}
			injectionFunction.apply(injectionFunction, args);
		}
	}
}