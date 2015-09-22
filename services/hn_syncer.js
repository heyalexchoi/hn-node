const Firebase = require("firebase");
const _  = require("underscore");
const ref = new Firebase("https://hacker-news.firebaseio.com");
const DBConnection = require('./db_connection');
const db = new DBConnection();
const itemsCollection = db.items;
const storiesCollection = db.stories;


/* 
Use HNSyncer to get all the data from HN's firebase API, 
throw it into mongodb, and keep it up to date 
*/
function HNSyncer() {
	this.ref = ref;
	this.keysWatched = {};
}

/* 
If not already watching a piece of data - 
ie: a story group, or an item - 
get the data, and execute callback on result
callback also executes whenever that data changes
*/
HNSyncer.prototype.on = function(endpoint, callback) {
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
HNSyncer.prototype.trackStories = function(type, callback) {
	this.on('/v0/' + type, callback);
};
/* 
get and track item with id
*/
HNSyncer.prototype.trackItem = function(id, callback) {
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
HNSyncer.prototype.syncStories = function(type, callback) {
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
// TO DO: this method should sync any new children / descendants
HNSyncer.prototype.syncItem = function(id, ancestor_id, callback) {
	this.trackItem(id, function(item, error) {
		if (item) {
			item._id = id;
			item.updated = Date();
			if (ancestor_id) { item.ancestor_id = ancestor_id; }
			itemsCollection.update({_id: id}, item, {upsert: true}, function(err, doc) {
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
HNSyncer.prototype.syncItemAndAllDescendants = function(id, ancestor_id, callback) {
	var self = this;
	this.syncItem(id, ancestor_id, function(item, error) {
		if (item && item.kids) {
			item.kids.map(function(kidID) {
				self.syncItemAndAllDescendants(kidID, ancestor_id, callback);
			});
		} 
		if (callback) callback(item, error);
	});
};
/* 
Syncs all types of stories, and all the items and their descendants.
*/
HNSyncer.prototype.syncEverything = function(callback) {
	var self = this;
	var types = ['topstories', 'newstories', 'askstories', 'showstories', 'jobstories'];
	types.map(function(type) {
		self.syncStories(type, function(stories) {
			stories.map(function(id) {
				self.syncItemAndAllDescendants(id, id, function(item, error) {								
					if (callback) callback(item, error);
				});
			});
		});
	});
};

module.exports = HNSyncer;
