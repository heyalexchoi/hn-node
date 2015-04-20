var express = require('express');
var router = express.Router();
var helper = require('../hnhelper');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'GO AWAY plz1' });
});

// TO DO: add page limit offset to req, query, and result
router.get('/stories/:id', function(req, res, next) {

    res.send('fuckin stories yo'); return;

});

// TO DO: add page limit offset to req, query, and result
router.get('/:type(*{3,}stories)', function(req, res, next) {
    helper.getStories(req.params.type, function(stories, error) {
        if (stories) res.json(stories);
        if (error) next(error);
    });
});


module.exports = router;
