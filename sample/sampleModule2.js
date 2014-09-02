module.exports = function($E, $L, $MethodBuilder, moment) {
  
  $MethodBuilder.add('getFormattedTime', function(tConnection, user, callback) {
  	callback(null, moment().fromNow());
  });

};