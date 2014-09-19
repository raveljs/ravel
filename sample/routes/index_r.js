module.exports = function($E, $L, $RouteBuilder) {
	$RouteBuilder.add(false, '/login', function(req, res) {
		res.render('login', {});
	});

	$RouteBuilder.add(true, '/', function(req, res) {
		res.render('app', {});
	});
}