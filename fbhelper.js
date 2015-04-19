var Firebase = require("firebase")
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/hn');

var ref = new Firebase("https://hacker-news.firebaseio.com");

function FirebaseHelper(ref) {
	this.ref = ref;
}

// get values for and subscribe to changes to top stories
FirebaseHelper.prototype.getTopStories = function(callback) {
	ref.child("/v0/topstories").once("value", function(snapshot) {
  		callback(snapshot.val());
	});	
}
// undo listening for get top stories
FirebaseHelper.prototype.stopTopStories = function(callbackref) {
	ref.child("/v0/topstories").off("value", callbackref);	
}

// get values for and subscribe to changes for item with id
FirebaseHelper.prototype.getItem = function(id, callback) {
	ref.child("/v0/item/"+id).on("value", function(snapshot) {
  		callback(snapshot.val());
	});
}

var helper = new FirebaseHelper(ref);

/*
to do:
write thing to sync up all data upfront
then unsubscribe
then listen for child added and removed
then write shit to recursively run up and down 
fetching and destroying children of added and removed items

 https://www.firebase.com/docs/web/api/query/on.html
https://www.firebase.com/docs/web/guide/retrieving-data.html

.on, .off, .once
"value" "child_added" "child_removed"
*/


helper.getTopStories(function(ids) {
	ids.map(function(id) {
		helper.getItem(id, function(item) {
			var collection = db.get('topstories');
			collection.insert(item, function(err, doc) {
				if (err) {
					console.error('done fucked up trying to save item ' + item.id)
				} else {
					console.log('done saved good this here item ' + item.id)
				}
			})
		})
	})
})

module.exports = helper





