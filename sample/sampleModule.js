module.exports = function($E, $L, $MethodBuilder) {
  
  $MethodBuilder.add('getNumbers', function(tConnection, user, callback) {
  	callback(null, [1,2,3]);
  });

};
