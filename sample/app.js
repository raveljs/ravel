var Ravel = require('../ravel.js');

var ravel = new Ravel();

//FIXME working off of the tapestry-vm parameters for now
//redis parameters
ravel.set('redis host', '127.0.0.1');
ravel.set('redis port', 16379);
ravel.set('redis password', 'password');
//mysql parameters
ravel.set('mysql host', '127.0.0.1');
ravel.set('mysql port', '13306');
ravel.set('mysql user', 'tapestry');
ravel.set('mysql password', 'password');
ravel.set('mysql database name', 'tapestry_test_schema');
ravel.set('mysql connection pool size', '32');
//Node/express parameters
ravel.set('app domain', 'localhost');
ravel.set('app port', '9080');
ravel.set('node domain', 'localhost');
ravel.set('node port', '9080');
ravel.set('express public directory', 'public');
ravel.set('express view directory', 'ejs');
ravel.set('express view engine', 'ejs');
ravel.set('express session secret', '7UKBJcbNl5wrTkmcKGNB');
//Google OAuth parameters
ravel.set('google oauth2 web client id', '1084472114850-2vo5cjdsm8go33ljqoap7k31j07bkohq.apps.googleusercontent.com');
ravel.set('google oauth2 web client secret', 'jSvmQzbWMcE0J9HdR_eDM-QN');
//Passport parameters
ravel.set('get user function', function() {
  //TODO implement
});
ravel.set('get or create user function', function() {
  //TODO implement
});

ravel.module('sample', './sampleModule');

ravel.service('sample', '/sample')
.getAll(false, function(req, res, rest) {
	ravel.modules.sample.getNumbers(undefined, function(err, result) {
	  rest.buildRestResponse(req, res, err, result);
	});
})
.get(false, function(req, res, rest) {
	rest.buildRestResponse(req, res, null, req.param('id'));
})
.done();

ravel.start();
