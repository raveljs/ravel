module.exports = function($E, $L, $MethodBuilder, users, tags, async) {

	/**
	 * TODO
	 */
	$MethodBuilder.add('getTag', function(tConnection, name, done) {
		async.waterfall([
			function(next) {
				tConnection.query('SELECT * FROM tag WHERE name=?',
	    		[name], next);
			},
			function(rows, fields, next) {
				if (rows.length === 0) {
					next(new $E.NotFound('Specified tag was not found in the database.'), null);
				} else {
					var tag = {
	          id:rows[0].id,
	          creationDate:rows[0].creation_date,
	          name:rows[0].name,
	          ownerId:rows[0].owner_id,
	          lastModified:rows[0].last_modified
	        };
	        next(null, user);
				}
			}
		], done);
	});

	/**
	 * TODO
	 */
	$MethodBuilder.add('getTags', function(tConnection, done) {
		async.waterfall([
			function(next) {
				tConnection.query('SELECT * FROM tag', {}, next);
			},
			function(rows, fields, next) {
				var tags = [];
				for (var i=0;i<rows.length;i++) {
					tags.push({
	          id:rows[i].id,
	          creationDate:rows[i].creation_date,
	          name:rows[i].name,
	          ownerId:rows[i].owner_id,
	          lastModified:rows[i].last_modified
	        });
				}
        next(null, tags);
			}
		], done);
	});

	/**
	 * TODO
	 */
	$MethodBuilder.add('createTag', function(tConnection, caller, name, done) {		
		async.waterfall([
			//check if tag exists already, throw duplicate entry
			function(next) {
				tags.getTag(tConnection,name,function(err, tag) {
					if (tag) {
						next($E.DuplicateEntry('A tag with name=\''+name+'\' already exists.'), null);
					} else {
						next(null, tag);
					}
				});
			},
			//insert tag
			function(existingTag, next) {
				tConnection.query('INSERT INTO tag SET ? ', {
					name: 'name',
					creationDate: Date.now(),
					ownerId:caller.id
				}, next);
			},
			function(result, next) {
				$L.i('Created tag \''+name+'\' with id=' + result.insertId);
				tags.getTag(tConnection,name,next);
			}
		], done);
	});

	/**
	 * TODO
	 */
	$MethodBuilder.add('deleteTag', function(tConnection, name, done) {
		async.waterfall([
			//tag must exist already
			function(next) {
				tags.getTag(tConnection,name,next);
			},
			//delete tag
			function(existingTag, next) {
				tConnection.query('DELETE FROM tag WHERE name = ? ', [name], next);
			},
			function(result, next) {
				$L.i('Deleted tag \'' + name + '\'');
				next(null, name);
			}
		], done);
	});

};