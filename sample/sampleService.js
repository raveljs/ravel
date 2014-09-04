module.exports = function($E, $L, $EndpointBuilder, $Transaction, $Rest, $Broadcast, sample) {
  
	$EndpointBuilder.getAll(false, function(req, res) {
		sample.getNumbers($Transaction.enter(), undefined, function(err, result) {
		  $Rest.buildRestResponse(req, res, err, result);
		});
	});
	
	$EndpointBuilder.get(false, function(req, res) {
		$Rest.buildRestResponse(req, res, null, req.param('id'));
		//$Broadcast.emit('/sample', 'user requested sample', req.param('id'));
	});
};
