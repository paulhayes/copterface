'use strict';

const Copterface = require('./lib/copterface');
const arDrone = require('ar-drone');
const Client = arDrone.Client;

//const client = arDrone.createClient({imageSize:"160x90"});
const control = arDrone.createUdpControl();
//const pngStream = client.getPngStream();
const PNG = require('pngjs').PNG;
const PngServer = require('./lib/PngServer');
const readline = require('readline');
const pngServer = new PngServer();
const udpNavdatasStream = new Client.UdpNavdataStream();

const FLYING_OK = "FLYING_OK";
const CTRL_FLYING = "CTRL_FLYING";
const videoOpts = {imageSize:"320x180"};
const verticalSpeed = 1;
const turnSpeed = 0.1;


const pngEncoder = new Client.PngEncoder(videoOpts);
const videoStream = new Client.TcpVideoStream(videoOpts);

var videoEventCallback = function(err) {
    if (err) {
      console.log('TcpVideoStream error: %s', err.message);
      setTimeout(function () {
        console.log('Attempting to reconnect to TcpVideoStream...');
        videoStream.connect(videoEventCallback);
      }, 1000);
    }
  }

  videoStream.connect(videoEventCallback);
  videoStream.on('error', videoEventCallback);

  videoStream.on('data', function(data) {
    pngEncoder.write(data);
  });  

var lastLED = 0;
var navdata;
var movement = {x:0,y:0};
var flying = false;
var emergency = true;

setTimeout(()=>{
	console.log("Reseting drone");
	emergency = false;
	control.ref({ fly:flying, emergency:emergency });
  	control.flush();

},1000);

var copterface = Copterface(pngEncoder,{ outputImage:true },function(info){
	if( !navdata || !navdata.demo ){
		move(movement);
		return;
	}
	process.stdout.write('\x1B[2J\x1B[0f');
	console.log("SPACE to takeoff and land. Debug face information can be viewed at http://localhost:8000");
	var best = info.rects.reduce((a,b)=>(a && a.confidence>b.confidence)?a:b, null);
	

	console.log("Console State:"+navdata.demo.controlState+"   Fly State:"+navdata.demo.flyState+" battery:"+navdata.demo.batteryPercentage+"% ");
	console.log("altitude:"+navdata.demo.altitude+" flying:"+navdata.droneState.flying);

	
	if( best && best.confidence > 0){
		var time = Date.now();
		if( ( time - lastLED ) > 1000 ){
			control.animateLeds("blinkOrange",1,1);
			lastLED = time;
		}
		console.log(best);
		
		if( best.x < -0.1 ){
			movement.x = turnSpeed;
		}
		else if(best.x > 0.1){
			movement.x = -turnSpeed;
		}
		else {
			movement.x = 0;
		}

		if( best.y < -0.1 ){
			movement.y = -turnSpeed;
		}
		else if(best.y > 0.1){
			movement.y = turnSpeed;
		
		}
		else {
			movement.y = 0;

		}
	}	
	else {
		console.log("no face detected");		
		movement.x = 0;

		if( navdata.demo.altitude < 1.2 ){
			movement.y = verticalSpeed;

		}
	}

	

	if(info.image){
		pngServer.sendPng(info.image);
	}

	move(movement);
		
});

function move(movement){
	//var ref = {  }
	//control.ref(ref);
	var pcmd = {};
	if( flying ){
		pcmd[ ( movement.x > 0 ) ? "clockwise":"counterClockwise" ] = Math.abs(movement.x);
		pcmd[ ( movement.y > 0 ) ? "up":"down" ] = Math.abs(movement.y);
	}
	console.log("movement:",pcmd);
	control.ref({ fly:flying, emergency:emergency });
	control.pcmd(pcmd);
	control.flush();
}

udpNavdatasStream.on('data',(d)=>navdata=d);
udpNavdatasStream.resume();

copterface.start();

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') {
    process.exit();
  }else if(key.name === 'c'){
  	client.calibrate(0);
  }
  if( key.name === 'space' && navdata){
  	if( navdata.droneState.flying === 0 ){
	  	//client.takeoff();
	  	flying = true;
 	  }
  	else
  		//client.land();
	  	flying = false;

  }
  if( key.name === 'escape' ){
  	emergency = true;
  	move(movement);
  }
});

