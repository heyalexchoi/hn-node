// TO DO: hnhelper can be broken down into an hn sync and a story builder

const Firebase = require("firebase");
const _  = require("underscore");
const ref = new Firebase("https://hacker-news.firebaseio.com");
const DBConnection = require('./db_connection');
const db = new DBConnection();
const itemsCollection = db.items;
const storiesCollection = db.stories;

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
			item.updated = Date();
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
HNHelper.prototype.getStories = function(type, offset, limit, callback) {
	const self = this;
	storiesCollection.findOne({type: type}, function(error, result) {
		if (error) { callback(error, result); }
		else if (!result) { callback( new Error("Couldn't find stories group: " + type), null);}
		else {			
			const storyIDs = result.stories.slice(Number(offset), Number(offset) + Number(limit));					
			self.getItems(storyIDs, function(err, res) {				
				const ordered = orderResults(storyIDs, res);
				callback(null, ordered);
			}); 
		}
	});
};

// sort results into order given in ids
function orderResults(ids, items) {
	const indexed = _.indexBy(items, '_id');
	return ids.map(function(id) { return indexed[id]; });
}

/* 
Asynchronously retrieves item with id 
*/
HNHelper.prototype.getItem = function(id, callback) {
	return itemsCollection.findOne({_id: id}, callback);
};

HNHelper.prototype.getItems = function(ids, callback) {
	return itemsCollection.find({_id: { $in: ids } }, callback);
};

HNHelper.prototype.getChildren = function(id, callback) {
	return itemsCollection.find({parent: id}, callback);
};

/* 
get item and populate child property with array of item objects
*/
HNHelper.prototype.getItemWithChildren = function(id, callback) {
	var self = this;
	var item;
	self.getItem(id)
	.then(function(resItem) {
		item = resItem;		
		return self.getItems(item.kids);
	})
	.then(function(resChildren) {				
		item.children = orderResults(item.kids, resChildren);
		callback(null, item);
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
				var childCount = 0;
				item.kids.map(function(kidID, index) {
					getItemAndDescendants(kidID, function(child, error) { 
						childCount ++;
						if (!item.children) { item.children = []; }
						item.children[index] = child;
						if (childCount == item.kids.length) {
							item.children = item.children.filter(function(e) { return e; }); // compact
						}
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
