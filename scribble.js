var hn = require('./services/hnhelper');



hn.getItemWithChildren(10217470, function(err, res) {
	console.log(res);	
	console.error('err: ' + err);
	process.exit();
});

