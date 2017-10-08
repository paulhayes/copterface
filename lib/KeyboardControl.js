const arDrone = require('ar-drone');
const UdpControl = require('../lib/control/UdpControl');
const readline = require('readline');

const takeoffKey = "space";
const calibrateKey = "c";
const leftKey = "a";
const rightKey = "d"
const forwardKey = "forward";
const backKey = "back";
const clockwiseKey = "e";
const counterClockwiseKey = "q";

function KeyboardControl(client,directions,opts){

	readline.emitKeypressEvents(process.stdin);
	process.stdin.setRawMode(true);

	/*
	if( ! ( control instanceof UdpControl ) )
		throw new Error("Invalid argument, KeyboardControl constructor 1st arg to be  UdpControl");	
	*/
	var flying = 0;
	

	var options = Object.assign({
		speed = 0.2
	},opts);
	client.on('navdata', (navdata)=>{
		flying = navdata.droneState.flying;
	});

	process.stdin.on('keypress', (str, key) => {
	  if (key.ctrl && key.name === 'c') {
	    process.exit();
	  } else switch(key.name){
	  	case calibrateKey:
		  	client.calibrate(0);
		  	break;
	  	case takeoffKey:
		  	if( flying === 0 ){
			  	client.takeoff();
		 	 }
		  	else
	  			client.land();
		  	}
		  	break;
	  	case forwardKey:
	  		directions.front = options.speed;
	  		delete directions.back;
	  	case backKey:
	  		directions.back = options.speed;
	  		delete directions.front;
  		case leftKey:
  			directions.left = options.speed;
  			delete directions.right;
		case rightKey:
			directions.right = options.speed;
			delete directions.left;
		case clockwiseKey:
			directions.clockwise = options.speed;
			delete directions.left;
	  } 


	});	
}

module.exports = KeyboardControl;