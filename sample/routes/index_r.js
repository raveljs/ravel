module.exports = function($E, $L, $RouteBuilder) {
	$RouteBuilder.public().add('/login', function(req, res) {
		res.render('login', {});
	});

	$RouteBuilder.private().add('/', function(req, res) {
		res.render('app', {});
	});
}