'use strict';

const path=require('path')
const jsFeatDir = path.dirname(require.resolve("jsfeat"));
global.jsfeat = require('jsfeat');

require(path.join(jsFeatDir,'../cascades/frontalface'));
require(path.join(jsFeatDir,'../cascades/bbf_face'));
require(path.join(jsFeatDir,'../cascades/bbf_face'));


var drawing = require('pngjs-draw');
var PNG = drawing( require('pngjs').PNG );
var pica = require('pica');

var copterface = exports = module.exports = function(pngStream,options,faceCallback){
	
	var lastPng;
	var lastPngTime;
	var pngDeltaTime;
	var faceInterval;
	var processingImage;
	var opts = options || {};

	if(typeof faceCallback !== 'function') throw new Error('missing callback, expected as second argument to copterface');

	pngStream.on('data', function(pngBuffer) {
		var currentTime = Date.now();
	    if( lastPngTime ){
	      pngDeltaTime = currentTime - lastPngTime;
	    }
	    lastPngTime = currentTime;
	    lastPng = pngBuffer;
	});

	var classifier = jsfeat.haar.frontalface;
	var img_u8,work_canvas,work_ctx,ii_sum,ii_sqsum,ii_tilted,edg,ii_canny;
	var options = new (function(){
	    this.min_scale = 2;
	    this.scale_factor = 1.15;
	    this.use_canny = false;
	    this.edges_density = 0.13;
	    this.equalize_histogram = true;
	    return this;
	});

	jsfeat.bbf.prepare_cascade(jsfeat.bbf.face_cascade);



	var start = function(interval){
		if(faceInterval) stop();
		interval = interval || 150;
		faceInterval = setInterval( detectFaces, interval);
	}

	var stop = function(){
		if( faceInterval ) clearInterval(faceInterval);
		faceInterval = null;
	}

	var detectFaces = function(){ 
      if( ( ! processingImage ) && lastPng )
      {
        processingImage = true;
        var png = new PNG();
        png.parse(lastPng),

        png.on('parsed',function(){
        	lastPng = null;
        	var imageData = this.data;
            var w = this.width;
            var h = this.height;
            
            //pica.resizeBuffer({src:imageData.data, width:imageData.width, height:imageData.height,toWidth:w,toHeight:h},function(err,imageData){
	            
	            if(!img_u8){
	              img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
	            }
	            if(!edg){
	              edg = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
	              ii_sum = new Int32Array((w+1)*(h+1));
	              ii_sqsum = new Int32Array((w+1)*(h+1));
	              ii_tilted = new Int32Array((w+1)*(h+1));
	              ii_canny = new Int32Array((w+1)*(h+1));
	            }
	            
	            jsfeat.imgproc.grayscale(imageData, w, h, img_u8, jsfeat.COLOR_RGBA2GRAY);

	            jsfeat.imgproc.equalize_histogram(img_u8, img_u8);
	            
	            /*
	            var saveBackPng = new PNG({width:w,height:h});
	            saveBackPng.data = imageData; //new Uint8ClampedArray( img_u8 );
	            saveBackPng.pack().pipe(fs.createWriteStream('out.png'));
				*/

	            /*
	            jsfeat.haar.edges_density = options.edges_density;
	            var rects = jsfeat.haar.detect_multi_scale(ii_sum, ii_sqsum, ii_tilted, options.use_canny? ii_canny : null, img_u8.cols, img_u8.rows, classifier, options.scale_factor, options.min_scale);
	            rects = jsfeat.haar.group_rectangles(rects, 1); 
	            */

	            var pyr = jsfeat.bbf.build_pyramid(img_u8, 24*2, 24*2, 4);

	            var rects = jsfeat.bbf.detect(pyr, jsfeat.bbf.face_cascade);
	            rects = jsfeat.bbf.group_rectangles(rects, 1);


	            var outputImage = null;

	            if( opts.outputImage ){
		            outputImage = new PNG({width:w,height:h});
					outputImage.data =  new Buffer( imageData );
		            rects.forEach((rect)=>{
			            outputImage.fillRect(Math.round(rect.x),Math.round(rect.y),Math.round(rect.width),Math.round(rect.height), outputImage.colors.white(50));
			            outputImage.drawText(Math.round(rect.x),Math.round(rect.y+0.5* rect.height),rect.confidence.toFixed(2), outputImage.colors.black(100))
		            });

	            }

	            rects.forEach((rect)=>{
			            rect.width = rect.width / w;
			            rect.height = rect.height / h;
			            rect.x = rect.x / w + 0.5*rect.width - 0.5;
			            rect.y = rect.y / h + 0.5*rect.height - 0.5;	            	
	            });

	            var info = {
	            	delatTime : pngDeltaTime,
	            	timestamp : lastPngTime,
	            	rects : rects,
	            	image : outputImage
	            }

	            faceCallback(info);

	            processingImage = false;
          	//});
    	});
	}
	};

	return {
		'stop':stop,
		'start':start
	}
};

