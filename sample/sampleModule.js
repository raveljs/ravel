module.exports = function($E, $L, $MethodBuilder, sample2) {
  
  $MethodBuilder.add('getNumbers', function(tConnection, user, callback) {
  	sample2.getFormattedTime(tConnection, user, function(err, result) {
  		callback(null, 'Returning array ' + result + ': ' + [1,2,3]);
  	});  	
  });

};
