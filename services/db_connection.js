const monk = require('monk');
const config = require('config');
const dbURL = process.env.MONGODB_URL || config.mongodb.url;
const db = monk(dbURL);

const storiesCollection = db.get('stories');
const itemsCollection = db.get('items');

itemsCollection.id = function (str) { return str; }; // override default monk obj id behavior

function DBConnection() {}

DBConnection.prototype.stories = storiesCollection;
DBConnection.prototype.items = itemsCollection;
DBConnection.prototype.db = db;

module.exports = DBConnection;