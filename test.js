const Copterface = require('./lib/copterface');
const arDrone = require('ar-drone');
const client = arDrone.createClient({imageSize:"160x90"});
const control = arDrone.createUdpControl();
const pngStream = client.getPngStream();
const PNG = require('pngjs').PNG;
const PngServer = require('./lib/PngServer');
const readline = require('readline');
const pngServer = new PngServer();

/* This is a stub for now. The most important test is that the dependancies have loaded */

setTimeout(()=>process.exit(),50);