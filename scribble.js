var util = require('util');
require('dotenv').load();
var Helper = require('./services/hn_helper');
var helper = new Helper();
var _ = require('underscore');
//var Syncer = require('./services/hn_syncer');
//var syncer = new Syncer();

function log(a) {
	console.log(util.inspect(a, {showHidden: false, depth: null}));
}

function inspect(a) {
	return util.inspect(a, {showHidden: false, depth: null});
}

console.log("MONGODB_URL: " + process.env.MONGODB_URL);

//syncer.syncEverything();
//var isEmpty = _.isEmpty({a:[1]}.b);
//console.log(isEmpty);

// var type = 'topstories';
// var limit = 20;
// var offset = 0;
// console.log("scribble");

// helper.getStories(type, offset, limit, function(error, stories) {

//     if (stories) console.log("stories: " + stories);
//     if (error) console.error("error: " + error);
// });

const db = helper.db;
const items = db.items;

items.index({'ancestor_id': 1}, function(err, res) {
	console.error("index err: "+err);	
	console.log("indexed items. index res: " + res);
	items.indexes(function(err, i) {
		console.error(err);
		console.log("indexes: " + inspect(i));
	})
})


helper.db.items.indexes(function(err, indexes){
	console.error(err);
	log("items indexes: " + inspect(indexes));
});

helper.db.stories.indexes(function(err, indexes){
	console.error(err);
	log("stories indexes: " + inspect(indexes));
});

//process.exit();

/*
hn.getItemWithChildren(10217470, function(err, res) {
	console.log(res);	
	console.error('err: ' + err);
	process.exit();
});
*/
