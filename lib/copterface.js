'use strict';

global.jsfeat = require('jsfeat');
require('../node_modules/jsfeat/cascades/frontalface');
require('../node_modules/jsfeat/cascades/bbf_face');

var PNG = require('pngjs').PNG;
var pica = require('pica');

var copterface = exports = module.exports = function(pngStream,faceCallback){
	
	var lastPng;
	var lastPngTime;
	var pngDeltaTime;
	var faceInterval;
	var processingImage;

	if(typeof faceCallback !== 'function') throw new Error('missing callback, expected as second argument to copterface');

	pngStream.on('error', console.log);
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
        png.parse(lastPng,function(err,imageData){
            var w = 160;
            var h = 90;

            pica.resizeBuffer({src:imageData.data, width:imageData.width, height:imageData.height,toWidth:w,toHeight:h},function(err,imageData){
	            if(err){
	              throw err;
	            }
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

	            var info = {
	            	delatTime : pngDeltaTime,
	            	timestamp : lastPngTime,
	            	rects : rects
	            }

	            faceCallback(info);

	            processingImage = false;
          	});
    	});
	}
	};

	return {
		'stop':stop,
		'start':start
	}
};

