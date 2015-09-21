var MongoClient = require('mongodb').MongoClient;
var config = require('config');
var dbURL = process.env.MONGODB_URL || config.mongodb.url;

function DBCleaner() {}
/* 
	Connects to mongo, removes items last updated more than a month ago, then repairs database to reclaim disk space.
*/
DBCleaner.prototype.clean = function(callback) {
	MongoClient.connect(dbURL, function(err, db) {  	
	  	
	  	if (err) {
	  		console.error(err);
	  		return;
	  	}

	  	console.log("Connected correctly to server at " + dbURL);
		
		var date = new Date();
		date.setMonth(date.getMonth() - 1);

	  	db.collection('items').remove({updated: {$lt: date}}, function(err, result) {
			if (err) {
				console.error(err);
			} else {
				console.log('remove success: ' + result);
			}
			db.command({repairDatabase:1}, function(err, result) {
				if (err) {
					console.error(err);
				} else {
					console.log('repair success: ' + result);
				}
				db.close();
				if (callback) callback();
			});
			
		});

	});
};

module.exports = DBCleaner;
