/**
 * Keeps clients aware of changes to application
 * data model so that they can automatically refresh
 * their UI without the user having to make a
 * request for new information.
 */
module.exports = function() {
	return function(req, res, next) {
		req.on('end', function() {
			//TODO assume we're only called on non-get routes
			//TODO emit proper event based on method and endpoint
			//TODO update DynamicResource to permit put/post/delete to entire collection
			//TODO break down path using path and emit recursively?
		});
		next();
	}
}