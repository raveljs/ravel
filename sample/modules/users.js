module.exports = function($E, $L, $MethodBuilder, users, async) {
  
  /**
	 * Retrieves the specified user object from the database using
	 * the profile returned by passport.js, or calls back with
	 * $E.NotFound
	 *
	 * @param {Object} tConnection a transaction-enabled database connection
	 * @param {String} authProvider currently only 'google' is supported.
	 * @param {Object} profile a user profile provided by Google, in the passport.js format
	 * @param {Function} done Callback format done(null, {Object}) or
	 *                            done(err, null)
	 */
	$MethodBuilder.add('getUserByProfile', function(tConnection, authProvider, profile, done) {
		var authProviderIdHashed = require('crypto').createHash('sha512').update(profile.id).digest('hex');
		async.waterfall([
			function(next) {
				tConnection.query('SELECT * FROM registered_user WHERE auth_provider=? AND auth_id=?',
	    		[authProvider, authProviderIdHashed], next);
			},
			function(results, next) {
				if (results.length === 0) {
					next(new $E.NotFound('Specified user was not found in the database.'), null);
				} else {
					var user = {
	          id:results[0].id,
	          authProvider:results[0].auth_provider,
	          authProviderId:results[0].auth_id,
	          displayName:results[0].display_name,
	          preferredEmail:results[0].preferred_email,
	          preferredEmailMd5:results[0].preferred_email_md5,
	          givenName:results[0].given_name,
	          familyName:results[0].family_name,
	          pictureURL:results[0].picture_url,
	          betaKey:results[0].beta_key,
	          middleName:undefined
	        };
	        next(null, user);
				}
			}
		], done);
	});


	/**
	 * Retrieves the specified user object from the database by id,
	 * or calls back with an $E.NotFound
	 *
	 * @param {Object} tConnection a transaction-enabled database connection
	 * @param {Number} userId the id of a user in the database
	 * @param {Function} done Callback format done(null, {Object}) or
	 *                            done(err, null)
	 */
  $MethodBuilder.add('getUser', function(tConnection, userId, done) {
  	async.waterfall([
  		function(next) {
  			tConnection.query('SELECT * FROM registered_user WHERE id=?', [userId], next);
  		},
  		function(results, next) {
  			if (results.length === 0) {
	        next(new $E.NotFound('Specified user was not found in the database.'), null);
	      } else {
	      	var user = {
		        id:results[0].id,
		        authProvider:results[0].auth_provider,
		        authProviderId:results[0].auth_id,
		        displayName:results[0].display_name,
		        preferredEmail:results[0].preferred_email,
		        preferredEmailMd5:results[0].preferred_email_md5,
		        givenName:results[0].given_name,
		        familyName:results[0].family_name,
		        pictureURL:results[0].picture_url,
		        betaKey:results[0].beta_key,
		        middleName:undefined
		      };
		      next(null, user);
	      }
  		}
		], done);
  });

	/**
	 * Automatically creates, updates or retrieves a user from the database
	 * using the profile returned from google via passport.js
	 *
	 * @param {Object} tConnection a transaction-enabled database connection
	 * @param {String} authProvider currently only 'google' is supported.
	 * @param {Object} profile a user profile provided by Google, in the passport.js format
	 * @param {Function} callback Callback format callback(null, {Object}) or
	 *                            callback(err, null)
	 */
  $MethodBuilder.add('getOrCreateUser', function(tConnection, authProvider, profile, done) {
  	var authProviderIdHashed = require('crypto').createHash('sha512').update(profile.id).digest('hex');
	  var preferredEmail = profile.emails.length>0 ? profile.emails[0].value : undefined;
	  var preferredEmailHashed = profile.emails.length>0 ? require('crypto').createHash('md5').update(profile.emails[0].value).digest('hex') : undefined;
	  var pictureURL;
	  if (profile._json && profile._json.picture) {
	    pictureURL = profile._json.picture;
	  }

	  //does the user exist already?
		users.getUserByProfile(tConnection, authProvider, profile, function(err, existingUser) {
			if (err instanceof $E.NotFound) {
				//create user, then return them
				async.waterfall([
			  	function(next) {
			  		tConnection.query(
	            'INSERT INTO registered_user SET ? ',
	            {
	              'auth_provider':authProvider,
	              'auth_id':authProviderIdHashed,
	              'display_name':profile.displayName,
	              'preferred_email':preferredEmail,
	              'preferred_email_md5':preferredEmailHashed,
	              'given_name':profile.name.givenName,
	              'family_name':profile.name.familyName,
	              'picture_url':pictureURL
	            }, next);
			  	},
			  	function(result, next) {
			  		users.getUser(tConnection, result.insertId, next)
			  	}
		  	], done);
			} else if (err) {
				done(err, null);
			} else {
				//update user with the current profile, then return the user
				async.waterfall([
					function(next) {
						tConnection.query('UPDATE registered_user ' +
			        'SET ? WHERE auth_provider='+tConnection.escape(authProvider)+' ' +
			        'AND auth_id='+tConnection.escape(authProviderIdHashed),
			        {
			          'display_name':profile.displayName,
			          'preferred_email':profile.emails.length>0 ? profile.emails[0].value : undefined,
			          'preferred_email_md5':preferredEmailHashed,
			          'given_name':profile.name.givenName,
			          'family_name':profile.name.familyName,
			          'picture_url':pictureURL
			        }, next);
					},
					function(result, next) {
						users.getUserByProfile(tConnection, authProvider, profile, done);
					}
				], done);
			}
		});
  });

};