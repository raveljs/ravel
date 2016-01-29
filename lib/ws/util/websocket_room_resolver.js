'use strict';

/**
 * Resolves a websocket room, such as /workspaces/1/tasks/1
 * to a registered room pattern such as /workspaces/:workspaceId/tasks/:taskId
 * and returns the associated room structure from rooms
 */
module.exports = function(rooms) {
  //cache resolving results for rooms
  //so that we don't have to search
  //every time
  const resolveCache = {};
  return {
    resolve: function(room) {
      let result = resolveCache[room];
      if (result) {
        return result;
      }
      let match;
      for (let key of Object.keys(rooms)) {
        match = rooms[key].regex.exec(room);
        if (match) {
          //convert context into dictionary of parameter values
          const values = match.splice(1);
          const params = {};
          for (let i=0;i<rooms[key].params.length;i++) {
            params[rooms[key].params[i]] = values[i];
          }
          result = {
            instance: room,
            room: rooms[key],
            params: params
          };
          resolveCache[room] = result;
          return result;
        }
      }
      return undefined;
    }
  };
};
