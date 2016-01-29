'use strict';

/**
 * Keeps clients aware of changes to application
 * data model so that they can automatically refresh
 * their UI without the user having to make a
 * request for new information.
 */

const upath = require('upath');

module.exports = function(Ravel) {
  return function(req, res, next) {
    if (req.method === 'GET') {
      next();
      return;
    }

    const doBroadcast = function(body) {
      //only broadcast stuff when the endpoint successfully returned
      if (!(res.statusCode === 200 || res.statusCode === 201)) {
        return;
      } else {
        let crudEvent;
        if (req.method === 'POST' && body) {
          crudEvent = 'create';
        } else if (req.method === 'PUT' && body) {
          crudEvent = 'change';
        } else if (req.method === 'DELETE') {
          crudEvent = 'delete';
        }

        if (!body) {
          body = '';
        }

        //determine room to broadcast to
        let route = req.route.path;
        const routeComponents = route.split('/');
        if (routeComponents.length > 1 && routeComponents[routeComponents.length-1][0] === ':') {
          //then the last component is a parameter, and we should
          //consider the 'resource' to be the route without that
          //parameter
          route = '/' + upath.join.apply(upath.join, routeComponents.splice(0,routeComponents.length-1));
        }  else {
          crudEvent += ' all';
        }
        let data = typeof(body) === 'string' ? body : JSON.stringify(body);   //eslint-disable-line no-extra-parens
        const jsonProtection = data.match(/^\)\]}'\,\n(.*)/);
        if (jsonProtection) {
          data = jsonProtection[1];
        }
        Ravel.broadcast.emit(route, crudEvent, data);
      }
    };

    //override all express methods which send something in a response
    const buildOverrideSender = function(fToOverride) {
      return function(body) {
        doBroadcast(body);
        fToOverride.apply(res, [body]);
      };
    };
    //all express response methods (send, json, jsonp) go through end()
    res.end = buildOverrideSender(res.end);

    next();
  };
};
