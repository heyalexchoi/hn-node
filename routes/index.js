var express = require('express');
var router = express.Router();
var helper = require('../hnhelper');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'GO AWAY plz1' });
});

// TO DO: add page limit offset to req, query, and result
router.get('/items/:id', function(req, res, next) {
    var id = Number(req.params.id);
    helper.getItemWithAllDescendants(id, function(item, error) {        
        if (item) res.json(item);
        if (error) next(error);
    });
});

// TO DO: add page limit offset to req, query, and result
router.get('/:type(*{3,}stories)', function(req, res, next) {
    helper.getStories(req.params.type, function(stories, error) {
        if (stories) res.json(stories);
        if (error) next(error);
    });
});


module.exports = router;
