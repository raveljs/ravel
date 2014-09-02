module.exports = function(Ravel, $E, $L) {
  return {
    tGetNumbers: function(tConnection, user, callback) {
      callback(null, [1,2,3]);
    }
  }
};
