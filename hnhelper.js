var Firebase = require("firebase");
var monk = require('monk');
var config = require('config');
var dbURL = process.env.MONGODB_URL || config.mongodb.url;
var db = monk(dbURL);

var ref = new Firebase("https://hacker-news.firebaseio.com");
var storiesCollection = db.get('stories');
var itemsCollection = db.get('items');

itemsCollection.id = function (str) { return str; };

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
// TO DO: this method should sync any new children / descendants
HNHelper.prototype.syncItem = function(id, callback) {
	this.trackItem(id, function(item, error) {
		if (item) {
			item._id = id;
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

/* 
Pulls out stories array for type (ie 'topstories'), 
gets the story item for each id, and asynchronously
returns an array of story items
*/
HNHelper.prototype.getStories = function(type, callback) {
	storiesCollection.findOne({type: type}, {}, function(error, result) {
		if (error && callback) {
			callback(result, error);
			return;
		} else if (!result && callback) {
			var findError = new Error("Couldn't find stories group: " + type);
			callback(result, findError);
			return;
		}
		var storyIDs = result.stories;
		var stories = [];
		var count = 0;
		storyIDs.map(function(id) {
			itemsCollection.findOne({_id: id}, function(error, result) {
				count ++;
				if (result) {stories.push(result);}
				if (count == storyIDs.length && callback) {callback(stories, error);}
			});
		});
	});
};

/* 
Asynchronously retrieves item with id 
*/
HNHelper.prototype.getItem = function(id, callback) {
	itemsCollection.findOne({_id: id}, {}, function(error, result) {
		if (!result && callback) {
			var findError = new Error("Couldn't find item with id: " + id);
			callback(result, findError);
		} else if (callback) {
			callback(result, error);
		}
	});
};

/* 
get item and populate child property with array of item objects
*/
HNHelper.prototype.getItemWithChildren = function(id, callback) {
	var self = this;
	self.getItem(id, function(item, error) {
		if (item && item.kids) {
			var count = 0;
			item.children = [];
			item.kids.map(function(kidID) {
				self.getItem(kidID, function(child, error) {
					count ++;
					if (child) { item.children.push(child); }
					if (count == item.kids.length) { callback(item, error); }
				});
			});
		} else {
			callback(item, error);
		}
	});
};

/* 
Recursively get item and all its descendants
callback needs to not fire until all children are in their parents
*/


HNHelper.prototype.getItemWithAllDescendants = function(id, callback) {
	
	var self = this;
	var count = 0;
	var originalItem;

	var getItemAndDescendants = function(id, callback) {
		count ++;
		self.getItem(id, function(item, error) {
			count --;
			if (!originalItem && item) { originalItem = item; } 
			if (item && item.kids) {
				item.kids.map(function(kidID) {
					getItemAndDescendants(kidID, function(child, error) { 
						if (!item.children) { item.children = []; }
						item.children.push(child);
						callback(item, error);
					});
				});
			} else {
				callback(item, error);
			} 
		});

	};
	
	getItemAndDescendants(id, function(result, error) {
		if (count===0) {
			callback(originalItem, error);
		}
	});

};

module.exports = new HNHelper(ref);
