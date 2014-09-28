var $Ravel = new require('../ravel.js')();

//FIXME working off of the tapestry-vm parameters for now. need to port it into a sample vagrant vm
//redis parameters
$Ravel.set('redis host', '127.0.0.1');
$Ravel.set('redis port', '16379');
$Ravel.set('redis password', 'password');
//mysql parameters
$Ravel.set('mysql host', '127.0.0.1');
$Ravel.set('mysql port', '13306');
$Ravel.set('mysql user', 'tapestry');
$Ravel.set('mysql password', 'password');
$Ravel.set('mysql database name', 'tapestry_test_schema');
$Ravel.set('mysql connection pool size', '32');
//Node/express parameters
$Ravel.set('app domain', 'localhost');
$Ravel.set('app port', '9080');
$Ravel.set('node domain', 'localhost');
$Ravel.set('node port', '9080');
$Ravel.set('express public directory', 'public');
$Ravel.set('express view directory', 'ejs');
$Ravel.set('express view engine', 'ejs');
$Ravel.set('express session secret', '7UKBJcbNl5wrTkmcKGNB');
//Google OAuth parameters
$Ravel.set('google oauth2 web client id', '1084472114850-2vo5cjdsm8go33ljqoap7k31j07bkohq.apps.googleusercontent.com');
$Ravel.set('google oauth2 web client secret', 'jSvmQzbWMcE0J9HdR_eDM-QN');
//Passport parameters
$Ravel.set('app route', '/');
$Ravel.set('login route', '/login');
$Ravel.set('get user function', function($Transaction, users, userId, done) {
  users.getUser($Transaction.start(), userId, done);
});
$Ravel.set('get or create user function', function($Transaction, accessToken, refreshToken, userProfile, done) {
  users.getOrCreateUser($Transaction.start(), 'google', profile, done);
});

//Import modules (APIs) using path to module file
$Ravel.module('users', './modules/users');

//Activate REST services using path to resource file
//$Ravel.resource('/sample', './services/pages');

//Create websocket rooms with path resolution (into params object) and custom auth function
$Ravel.room('/sample/:sampleId', function(userId, params, callback) {
	//should the user be allowed to join the given room?
	callback(null, true);
});

$Ravel.routes('./routes/index_r');

$Ravel.start();
