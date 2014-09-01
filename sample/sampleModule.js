module.exports = function(Ravel, l) {
  return {
    tGetNumbers: function(tConnection, user, callback) {
      callback(null, [1,2,3]);
    }
  }
};
