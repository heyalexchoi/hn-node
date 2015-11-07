// TO DO: hnhelper can be broken down into an hn sync and a story builder

const Firebase = require("firebase");
const _  = require("underscore");
const ref = new Firebase("https://hacker-news.firebaseio.com");
const DBConnection = require('./db_connection');
const db = new DBConnection();
const itemsCollection = db.items;
const storiesCollection = db.stories;


function HNHelper() {}

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

function buildTree(ancestor, descendants) {
	var indexedDescendants = _.indexBy(descendants, '_id');
	//console.log(indexedDescendants);

	buildDescendants(ancestor, indexedDescendants);

	return ancestor;
}

function buildChildren(parent, indexedChildren) {
	parent.children = parent.kids.map(function(kidID) {
		return indexedChildren[kidID];
	}).filter(function(child) {
		if (child) { return child; }
	});
	return parent;
}

function buildDescendants(parent, indexedChildren) {
	if (!_.isEmpty(parent.kids)) {
		var builtParent = buildChildren(parent, indexedChildren);		
		parent.children.map(function(child) {
			buildDescendants(child, indexedChildren);
		});
	}
}

HNHelper.prototype.getItemWithAllDescendants = function(id, callback) {
	var self = this;
	var item;
	self.getItem(id)
	.then(function(resItem) {
		item = resItem;
		return itemsCollection.find({ancestor_id: id});	
	})
	.then(function(resDescendants) {
		return buildTree(item, resDescendants);				
	})
	.then(function(built) {
		callback(null, built);
	}, function(error) {
		callback(error, null);
	})
};

module.exports = HNHelper;
