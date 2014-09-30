module.exports = function($E, $L, $EndpointBuilder, $Transaction, $Rest, tags) {
  
	$EndpointBuilder.private().getAll(function(req, res) {
		tags.getTags($Transaction.enter(), function(err, result) {
		  $Rest.buildRestResponse(req, res, err, result);
		});
	});
	
	$EndpointBuilder.private().get(function(req, res) {
		tags.getTag($Transaction.enter(), req.param('name'), function(err, result) {
		  $Rest.buildRestResponse(req, res, err, result);
		});
	});

	$EndpointBuilder.private().post(function(req, res) {
		tags.createTag($Transaction.enter(), req.user, req.param('name'), function(err, result) {
		  $Rest.buildRestResponse(req, res, err, result, $Rest.CREATED);
		});
	});

	$EndpointBuilder.private().delete(function(req, res) {
		tags.deleteTag($Transaction.enter(), req.param('name'), function(err, result) {
		  $Rest.buildRestResponse(req, res, err, result);
		});
	});
};
