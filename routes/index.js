var express = require('express');
var router = express.Router();
var HNHelper = require('../services/hn_helper');
var helper = new HNHelper();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'woof woof' });
});

// TO DO: add page limit offset to req, query, and result
router.get('/items/:id', function(req, res, next) {
    var id = Number(req.params.id);
    helper.getItemWithAllDescendants(id, function(error, item) {        
        if (item) res.json(item);
        if (error) next(error);
    });
});

// minimalized item without children. can be used to determine if a local item on client is up to date
router.get('/items/:id/updated', function(req, res, next) {
    var id = Number(req.params.id);
    helper.getItem(id, function(error, item) {
        if (item) res.json({id: item.id, updated: item.updated, descendants: item.descendants});
        if (error) next(error);
    });
});

// TO DO: add page limit offset to req, query, and result
router.get('/:type(*{3,}stories)', function(req, res, next) {
    var type = req.params.type;
    var limit = req.query.limit || 25;
    var offset = req.query.offset || 0;

    helper.getStories(type, offset, limit, function(error, stories) {
        if (stories) res.json(stories);
        if (error) next(error);
    });
});


module.exports = router;
