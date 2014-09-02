module.exports = function($E, $L, $EndpointBuilder, $Modules, $Rest) {
  
	$EndpointBuilder.getAll(false, function(req, res) {
		$Modules.sample.getNumbers(undefined, function(err, result) {
		  $Rest.buildRestResponse(req, res, err, result);
		});
	});
	
	$EndpointBuilder.get(false, function(req, res) {
		$Rest.buildRestResponse(req, res, null, req.param('id'));
	});
};
