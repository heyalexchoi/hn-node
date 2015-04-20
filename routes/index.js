var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'GO AWAY plz1' });
});

/* GET Userlist page. */
router.get('/userlist', function(req, res) {
    var db = req.db;
    var collection = db.get('usercollection');
    collection.find({},{},function(e,docs){
        res.render('userlist', {
            "userlist" : docs
        });
    });
});
// TO DO: add page limit offset to req, query, and result
router.get('/:type(*stories)', function(req, res, next) {
	var collection = req.db.get('stories');
	var stories = collection.findOne({type: req.params.type}, {}, function(error, result) {
        if (error) {
            next(error); 
            return;
        } else if (!result) {
            res.sendStatus(404);
            return;
        }
		var storyIDs = result.stories;
		var stories = [];
		var count = 0;
		storyIDs.map(function(id) {
			req.db.get('items').find({_id: id}, function(error, result) {
				count ++;
				if (result) {stories.push(result);}
				if (count == storyIDs.length) { res.json(stories); }
			});
		});
	});
});

/* GET New User page. */
router.get('/adduser', function(req, res) {
    res.render('adduser', { title: 'Add New User' });
});

/* POST to Add User Service */
router.post('/adduser', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var userName = req.body.username;
    var userEmail = req.body.useremail;

    // Set our collection
    var collection = db.get('usercollection');

    // Submit to the DB
    collection.insert({
        "username" : userName,
        "email" : userEmail
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // If it worked, set the header so the address bar doesn't still say /adduser
            res.location("userlist");
            // And forward to success page
            res.redirect("userlist");
        }
    });
});

module.exports = router;
