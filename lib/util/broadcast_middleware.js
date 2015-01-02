'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * Keeps clients aware of changes to application
 * data model so that they can automatically refresh
 * their UI without the user having to make a
 * request for new information.
 */

var path = require('path');

module.exports = function(Ravel) {
  return function(req, res, next) {
    if (req.method === 'GET') {
      next();
      return;
    }

    var doBroadcast = function(body) {
      //only broadcast stuff when the endpoint successfully returned
      if (body && (res.statusCode === 200 || res.statusCode === 201)) {
        var crudEvent;
        //translate method into event
        switch (req.method) {
          case 'POST':
            crudEvent = 'create';
            break;
          case 'PUT':
            crudEvent = 'change';
            break;
          case 'DELETE':
            crudEvent = 'delete';
            break;
          default:
            //do nothing;
            break;
        }
        //determine room to broadcast to
        var route = req.route.path;
        var routeComponents = route.split('/');
        if (routeComponents.length > 1 && routeComponents[routeComponents.length-1][0] === ':') {
          //then the last component is a parameter, and we should
          //consider the 'resource' to be the route without that
          //parameter
          route = '/' + path.join.apply(path.join, routeComponents.splice(0,routeComponents.length-1));
        }  else {
          crudEvent += ' all';
        }
        var data = body;
        var jsonProtection = data.match(/^\)\]}'\,\n(.*)/);
        if (jsonProtection) {
          data = jsonProtection[1];
        }
        Ravel.broadcast.emit(route, crudEvent, data);
      }
    };

    //override all express methods which send something in a response
    var buildOverrideSender = function(fToOverride) {
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
