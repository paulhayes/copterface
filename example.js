var Copterface = require('./lib/copterface');
var arDrone = require('ar-drone');
var client = arDrone.createClient();
var pngStream = client.getPngStream();


var copterface = Copterface(pngStream,function(rects){
	console.log(rects);
});

copterface.start();
