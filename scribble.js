var Helper = require('./services/hn_helper');
var helper = new Helper();
var _ = require('underscore');
var Syncer = require('./services/hn_syncer');
var syncer = new Syncer();

//syncer.syncEverything();
//var isEmpty = _.isEmpty({a:[1]}.b);
//console.log(isEmpty);

helper.getItemWithAllDescendants(10250085, function(error, item) {        
        if (item) console.log(item);
        if (error) console.error(error);
    });

//process.exit();

/*
hn.getItemWithChildren(10217470, function(err, res) {
	console.log(res);	
	console.error('err: ' + err);
	process.exit();
});
*/
