module.exports = function($E, $L, $MethodBuilder, sample2) {
  
  $MethodBuilder.add('getNumbers', function(tConnection, user, callback) {
  	sample2.tGetLetters(tConnection, user, function(err, result) {
  		$L.i(result);
  	});
  	callback(null, [1,2,3]);
  });

};
