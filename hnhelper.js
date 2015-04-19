var Firebase = require("firebase");
var monk = require('monk');
var config = require('config');
var dbConfig = config.get('hnhelper.dbConfig');
var db = monk(dbConfig.url);

var ref = new Firebase("https://hacker-news.firebaseio.com");
var storiesCollection = db.get('stories');
var itemsCollection = db.get('items');

/* 
Use HNHelper to get all the data from HN's firebase API, 
throw it into mongodb, and keep it up to date 
*/
function HNHelper(ref) {
	this.ref = ref;
	this.keysWatched = {};
}
/* 
If not already watching a piece of data - 
ie: a story group, or an item - 
get the data, and execute callback on result
callback also executes whenever that data changes
*/
HNHelper.prototype.on = function(endpoint, callback) {
	if (!this.keysWatched[endpoint]) {
		ref.child(endpoint).on("value", function(snapshot) {
			if (callback) callback(snapshot.val());
		});	
		this.keysWatched[endpoint] = endpoint;	
	} 
};
/* 
get and track stories 'topstories' or 'newstories' or whatever
*/
HNHelper.prototype.trackStories = function(type, callback) {
	this.on('/v0/' + type, callback);
};
/* 
get and track item with id
*/
HNHelper.prototype.trackItem = function(id, callback) {
	this.on('/v0/item/' + id, callback);
};

/* 
gets array of story ids for given story type: top stories, new stories, job stories, etc
writes to db via update, and and updates with hn firebase api
can be found in collection db.stories
document structure within collection is {type: 'topstories', stories: [1,2,3]}
stories are represented by their ids
calls callback on results
*/
HNHelper.prototype.syncStories = function(type, callback) {
	this.trackStories(type, function(stories, error) {
		if (stories) {
			storiesCollection.update({'type': type}, 
				{'type': type, 'stories': stories}, 
				{upsert: true}, 
				function(err, doc) {
					if (callback) callback(stories, err);
				});	
		} else {
			if (callback) callback(stories, error);
		}
	});
};
/* 
gets object for item with id
writes to db via update, 
and updates with hn firebase api
can be found in collection db.items
kids (children) are represented by IDs
*/
HNHelper.prototype.syncItem = function(id, callback) {
	this.trackItem(id, function(item, error) {
		if (item) {
			itemsCollection.update({'id': id}, item, {upsert: true}, function(err, doc) {
				if (callback) callback(item, err);
			});	
		} else {
			if (callback) callback(item, error);
		}
	});
};
/* 
recursively runs sync item on item with id, and all its descendants.
callback is called on every result from sync item
*/
HNHelper.prototype.syncItemAndAllDescendants = function(id, callback) {
	var self = this;
	this.syncItem(id, function(item, error) {
		if (item && item.kids) {
			item.kids.map(function(kidID) {
				self.syncItemAndAllDescendants(kidID, callback);
			});
		} 
		if (callback) callback(item, error);
	});
};
/* 
Syncs all types of stories, and all the items and their descendants.
*/
HNHelper.prototype.syncEverything = function(callback) {
	var self = this;
	var types = ['topstories', 'newstories', 'askstories', 'showstories', 'jobstories'];
	types.map(function(type) {
		self.syncStories(type, function(stories) {
			stories.map(function(id) {
				self.syncItemAndAllDescendants(id, function(item, error) {
					if (callback) callback(item, error);
				});
			});
		});
	});
};



module.exports = new HNHelper(ref);
