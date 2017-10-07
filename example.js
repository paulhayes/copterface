'use strict';

var Copterface = require('./lib/copterface');
var arDrone = require('ar-drone');
var client = arDrone.createClient();
var pngStream = client.getPngStream();
var http = require('http');
var PNG = require('pngjs').PNG;


var copterface = Copterface(pngStream,function(info){
	console.log(info);
	var pngBuffer = PNG.sync.write(info.image, { colorType: 6 });
	server.sendPng( pngBuffer );
});

copterface.start();


var PngServer = function(client, opts) {

  opts = opts || {};
  var connections = [];
  
  var server = http.createServer(function(req, res) {
    
    res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=--daboundary' });

    connections.add(res);

  });

  this.sendPng = function (buffer) {
  	console.log(buffer.length);
  		connections.forEach((res)=>{
		  res.write('--daboundary\nContent-Type: image/png\nContent-length: ' + buffer.length + '\n\n');
		  res.write(buffer); 

  		});

    }

  server.listen(opts.port || 8000);
};

var server = new PngServer();