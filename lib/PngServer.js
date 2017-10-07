var PNG = require('pngjs').PNG;
var http = require('http');

//allocate a 1MB buffer for image
var tmpPngFileBuffer = new Buffer(1024*1024);
var PngServer = function(client, opts) {

  opts = opts || {};
  var connections = [];
  
  var server = http.createServer(function(req, res) {
    
    res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=--daboundary' });

    connections.push(res);

  });

  this.sendPng = function (buffer) {
  	
  		if( buffer instanceof PNG ){
        var image = buffer;
        var len = 0;
        var pngServer = this;
  
		    image.pack().on('data',(buffer)=>{
				  buffer.copy(tmpPngFileBuffer,len,0,buffer.length);
				  len += buffer.length;
        }).on('end',function(){
				  pngServer.sendPng( tmpPngFileBuffer.slice(0,len) );
        });
			 
       return;
  		}

  		connections.forEach((res)=>{
		  res.write('--daboundary\nContent-Type: image/png\nContent-length: ' + buffer.length + '\n\n');
		  res.write(buffer); 

  		});

    }

  server.listen(opts.port || 8000);
};

module.exports = PngServer;