module.exports = function($E, $L, $EndpointBuilder, $Rest, sample) {
  
	$EndpointBuilder.getAll(false, function(req, res) {
		sample.getNumbers(undefined, function(err, result) {
		  $Rest.buildRestResponse(req, res, err, result);
		});
	});
	
	$EndpointBuilder.get(false, function(req, res) {
		$Rest.buildRestResponse(req, res, null, req.param('id'));
	});
};
