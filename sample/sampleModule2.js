module.exports = function($E, $L, $MethodBuilder) {
  
  $MethodBuilder.add('getLetters', function(tConnection, user, callback) {
  	callback(null, ['a','b','c']);
  });

};