module.exports = function($Modules, $E, $L, $ServiceBuilder, $Rest) {
  
	$ServiceBuilder.getAll(false, function(req, res) {
		$Modules.sample.getNumbers(undefined, function(err, result) {
		  $Rest.buildRestResponse(req, res, err, result);
		});
	});
	
	$ServiceBuilder.get(false, function(req, res) {
		$Rest.buildRestResponse(req, res, null, req.param('id'));
	});
};
