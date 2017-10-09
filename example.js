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
const videoOpts = {imageSize:"320x170"};
const altitudeAdjustSpeed = 1;
const adjustSpeed = 0.2;
const forwardVelocity = 200;
const decay = 0.8;
const frameDelayTimeout = 1000;

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
  
  pngEncoder.on('error', (e)=>{
  	console.log(e);
  	process.exit();
  });

  videoStream.connect(videoEventCallback);
  videoStream.on('error', videoEventCallback);

  videoStream.on('data', function(data) {
  	pngEncoder.write(data);
  });

var lastLED = 0;
var navdata;
var movement = {x:0,y:0,z:0,yaw:0,desiredForwardSpeed:0};
var pcmd = {};
var flying = false;
var emergency = false;
var bestFaceRect;
var newFrameRecieved = false;
var lastFrameTime = Date.now();

var copterface = Copterface(pngEncoder,{ outputImage:true  },function(info){
	if( !navdata || !navdata.demo ){
		return;
	}

	newFrameRecieved = true;
	lastFrameTime = Date.now();

	process.stdout.write('\x1B[2J\x1B[0f');
	console.log("SPACE to takeoff and land. Debug face information can be viewed at http://localhost:8000");
	console.log("Escpae does an emergency cut out. The C key does ground calibration");
	var best = info.rects.reduce((a,b)=>(a && a.confidence>b.confidence)?a:b, null);	

	console.log("Console State:"+navdata.demo.controlState+"   Fly State:"+navdata.demo.flyState+" battery:"+navdata.demo.batteryPercentage+"% ");
	console.log("altitude:"+navdata.demo.altitude+" flying:"+navdata.droneState.flying);
	if( best && best.confidence > 0){
		var time = Date.now();
		if( ( time - lastLED ) > 1000 ){
			control.animateLeds("blinkOrange",1,1);
			lastLED = time;
		}
		console.log("FACE AT x:"+best.x.toFixed(2)+",y:"+best.y.toFixed(2)+" width:"+best.width.toFixed(2));
				
		bestFaceRect = best;

	}	
	else {
		console.log("no face detected");		
		//correctAltitude();

	}

	//driftCompensation();
	

	if(info.image){
		pngServer.sendPng(info.image);
	}

	var cols = 80;
	drawCentreHeading(cols, "  velocity  ");
	drawCentreFloat( cols, "z="+Math.round( navdata.demo.velocity.x ) );
	drawBar(cols, navdata.demo.velocity.x / 200);
	drawCentreFloat( cols, "x="+Math.round(  navdata.demo.velocity.y ) );
	drawBar(cols, navdata.demo.velocity.y / 200);
	drawCentreFloat( cols, "y="+Math.round( navdata.demo.velocity.z ) );
	drawBar(cols, navdata.demo.velocity.z / 200);
	drawCentreHeading(cols, "  movement  ");

	Object.keys(movement).forEach((key)=>{
		drawCentreFloat( cols, key+"="+movement[key].toFixed() );
		drawBar(cols, movement[key]);
	});
		
});

function drawCentreFloat(size,t){
	var half = Math.round((size)/2);
	console.log( (t).toString().padEnd(half," ").padStart(size," ") );
}

function drawCentreHeading(size,label){
	console.log("".padStart(size/2-Math.floor(label.length/2),"#") +label+"".padStart(size/2-Math.ceil(label.length/2),"#"));
	
}

function drawBar(size,t){
	if( t > 1 ) t = 1;
	if( t < -1 ) t = -1;
	var half = Math.round((size-1)/2);
	if( t<0 ) half++;
	var padSide = ( t < 0 )? String.prototype.padStart : String.prototype.padEnd;
	var oppositeSide = ( t >= 0 ) ? String.prototype.padStart : String.prototype.padEnd;
	t = Math.abs(t);
	console.log( oppositeSide.call(padSide.call(padSide.call("+",Math.round(half*t),"-"),half," "),size," ") );

}

function decayMovement(){
	movement.x *= decay;
	movement.y *= decay;
	movement.z *= decay;
	movement.yaw *= decay;
	movement.desiredForwardSpeed *= decay;
}

function move(){
	//var ref = {  }
	//control.ref(ref);
	if( navdata && navdata.droneState.flying ){
		pcmd[ ( movement.yaw > 0 ) ? "clockwise":"counterClockwise" ] = Math.abs(movement.yaw);
		if(movement.x!=0) pcmd[ ( movement.x > 0 ) ? "right" : "left" ] = Math.abs(movement.x);
		if(movement.y!=0) pcmd[ ( movement.y > 0 ) ? "up":"down" ] = Math.abs(movement.y);
		if(movement.z!=0) pcmd[ ( movement.z > 0 ) ? "front" : "back" ] = Math.abs(movement.z);
	} 
	control.ref({ fly:flying, emergency:emergency });
	control.pcmd(pcmd);
	control.flush();
	pcmd = {};
	
}

function draw(){

}

udpNavdatasStream.on('data',(d)=>{
	navdata=d;
	update();
});

function update(){
	var elapsed = Date.now() - lastFrameTime;

	if( newFrameRecieved ){
		
		newFrameRecieved = false;		
	}

	if(elapsed > frameDelayTimeout){
		flying = false;

	}
	correctAltitude();
	driftCompensation();
	lookAtFace();
	move();	
	decayMovement();

}

function lookAtFace(){
		if( !bestFaceRect )
			return;
		var best = bestFaceRect;
		bestFaceRect = null;

		const moveThreshold = 0.15;

		if( best.x < -moveThreshold ){
			movement.yaw = -adjustSpeed;
		}
		else if(best.x > moveThreshold){
			movement.yaw = adjustSpeed;
		}
		else {
			movement.yaw = 0;
		}

		if( best.y < -moveThreshold ){
			movement.y = adjustSpeed;
		}
		else if(best.y > moveThreshold){
			movement.y = -adjustSpeed;
		
		}
		else {
			movement.y = 0;
		}

		if( best.width > 0 && best.width < moveThreshold ){
			movement.desiredForwardSpeed = forwardVelocity;
		}

}

function driftCompensation(){
	if( navdata.demo ){
		var compensationThresold = 50;
		if( Math.abs( navdata.demo.velocity.x - movement.desiredForwardSpeed ) > compensationThresold ){
			movement.z = (-navdata.demo.velocity.x + movement.desiredForwardSpeed) / 2000 ;
		}
		if( Math.abs(navdata.demo.velocity.y) > compensationThresold ){
			movement.x = -navdata.demo.velocity.y / 2000 ;
		}
		
			
	}
}

function correctAltitude(){
	if( !navdata.demo ){
		return;
	}

	if( navdata.demo.altitude > 0 && navdata.demo.altitude < 1.2 ){
		movement.y = altitudeAdjustSpeed;
	}
	else if( navdata.demo.altitude > 1.8 ){
		movement.y = -altitudeAdjustSpeed;
	}

}


udpNavdatasStream.resume();

copterface.start();

setTimeout(()=>{
	control.config('general:navdata_demo', 'TRUE');
},500);

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {

  if (key.ctrl && key.name === 'c') {
    process.exit();
  }else if(key.name === 'c'){
  	//client.calibrate(0);
  	if( navdata.droneState.flying === 0 ){
	  	control.raw('FTRIM',)
		control.flush();
		console.log("setting ground");
  	}
  }
  if( key.name === 'space' && navdata){

  	if( navdata.droneState.emergencyLanding === 1 ){
  		var startTime = Date.now();
  		console.log("Reseting drone");
			
  		var intervalID = setInterval(()=>{
  			emergency = true;
			control.config('general:navdata_demo', 'TRUE');
			control.ref({ fly:flying, emergency:emergency });
		  	control.flush();
		  	var elapsed = Date.now() - startTime;
		  	if( elapsed >1000 ){
		  		clearInterval(intervalID);
		  		emergency = false;
		  	}
  		},30);
  		
		return;
  	}

  	if( navdata.droneState.flying === 0 ){
	  	//client.takeoff();
	  	flying = true;
 	  }
  	else
  		//client.land();
	  	flying = false;

  }
  if( key.name === 'escape' ){
  	flying = false;
  	control.raw('REF', 1<<8);
  	control.flush();

  }
});

