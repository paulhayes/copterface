Installing
==========

```
npm install
```

Running Example
==========

    node example.js

Using the library
=========

Add it to your node project
```
npm install copterface --save
```

Here's a simple example, showing how you can use copterface
```
const client = arDrone.createClient({imageSize:"160x90"});
const pngStream = client.getPngStream();
var copterface = new Copterface(pngStream,{},function(info){
    console.log(info);
});

copterface.start();
```


#### CopterFace(pngStream,options,callback)

##### `options` an object with the following optional key/value pairs :
* `outputImage` ( boolean ), whether to generate a debug png and include in the info object passed to callback.

##### `callback` an function that recieves the info object :
* `info.rects` an array of normalized rects for each face identifed
* `info.image` included if the outputImage flag is set to true. This is a PNG object that has had it's pack method called and will be emitting 'data' and 'end' events.
