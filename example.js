'use strict';

const Copterface = require('./lib/copterface');
const arDrone = require('ar-drone');
const client = arDrone.createClient({imageSize:"160x90"});
const control = arDrone.createUdpControl();
const pngStream = client.getPngStream();
const PNG = require('pngjs').PNG;
const PngServer = require('./lib/PngServer');
const readline = require('readline');
const pngServer = new PngServer();


const FLYING_OK = "FLYING_OK";
const CTRL_FLYING = "CTRL_FLYING";

const speed = 1;
const turnSpeed = 0.1;

var lastLED = 0;
var navdata;
var movement = {x:0,y:0};
var copterface = Copterface(pngStream,{ outputImage:true },function(info){
	process.stdout.write('\x1B[2J\x1B[0f');
	console.log("SPACE to takeoff and land. Debug face information can be viewed at http://localhost:8000");
	var best = info.rects.reduce((a,b)=>(a && a.confidence>b.confidence)?a:b, null);
	if( !navdata.demo ){
		console.log("Missing demo info from navdata");
		return;
	}
	console.log("Console State :"+navdata.demo.controlState+" Fly State : "+navdata.demo.flyState+" battery:"+navdata.demo.batteryPercentage+"% ");
	console.log("altitude:"+navdata.demo.altitude+" flying:"+navdata.droneState.flying);

	
	if( best && best.confidence > 0){
		var time = Date.now();
		if( ( time - lastLED ) > 1000 ){
			client.animateLeds("blinkOrange",1,1);
			lastLED = time;
		}
		console.log(best);
		
		if(  navdata.droneState.flying ){

			if( best.x < -0.1 ){
				client.clockwise(turnSpeed);
				movement.x = turnSpeed;
			}
			else if(best.x > 0.1){
				client.counterClockwise(turnSpeed);				
				movement.x = -turnSpeed;
			}
			else {
				client.clockwise(0);
				movement.x = 0;
			}

			if( best.y < -0.1 ){
				client.up(turnSpeed);
				movement.y = turnSpeed;
			}
			else if(best.x > 0.1){
				client.down(turnSpeed);	
				movement.y = -turnSpeed;
			
			}
			else {
				client.down(0);
				movement.y = 0;

			}
			
		}
	}	
	else {
		console.log("no face detected");		
		client.clockwise(0);
		movement.x = 0;
	}

	console.log("movement:",movement);

	if(info.image){
		pngServer.sendPng(info.image);
	}
		
});

client.on('navdata',(d)=>navdata=d);

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
	  	client.takeoff();
 	  }
  	else
  		client.land();
  }
});

