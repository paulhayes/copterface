var PNG = require('pngjs').PNG;
var http = require('http');

//allocate a 1MB buffer for image
var tmpPngFileBuffer = new Buffer(1024*1024);
var PngServer = function(client, opts) {

  opts = opts || {};
  var connections = [];
  
  var server = http.createServer(function(req, res) {
    
    switch(req.url){
      case '/image.png':      
      sendImage(req,res);
      break;
      case '/':
      case '/index.html':
      sendPage(req,res);
      break;
    }

  });

  var sendPage = function(req,res){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("<html><img src=\"/image.png\" /></html>");
    res.end();
  }

  var sendImage = function(req,res){

    res.writeHead(200, { 
      'Connection': 'Close',
      'Expires': '-1',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0, false',
      'Pragma': 'no-cache',
      'Content-Type': 'multipart/x-mixed-replace; boundary=--daboundary' 
    });
    res.write("--daboundary\r\n");
    var i = connections.length;
    res.on("close",()=>{
      connections.splice(connections.indexOf(res),1);
      console.log("CLOSED!!!!");
    });
    connections.push(res);

  }

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
  		  res.write('Content-Type: image/png\nContent-length: ' + buffer.length + '\n\n');
        res.write(buffer); 
        res.write("--daboundary\r\n");
  		});

    }

  server.listen(opts.port || 8000);
};

module.exports = PngServer;