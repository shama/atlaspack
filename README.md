# atlaspack

Pack rectangles (or images) into a rectangle (or canvas texture atlas). View the
[demo](http://shama.github.com/atlaspack/).

## example
This will load 0-99 images and fit them onto a canvas texture atlas:

```js
// create a canvas
var canvas = document.createElement('canvas');
document.body.appendChild(canvas);
canvas.width = 128;
canvas.height = 128;

// Create a starting atlas based on the canvas
var atlas = require('atlaspack')(canvas);

for (var i = 0; i < 100; i++) {
  var img = new Image();
  img.id = i;
  img.src = 'images/' + i + '.png';
  img.onload = function() {
    atlas.pack(img);
  };
}
```

You can pack generic rectangles into an atlas as well. The following example
will create a 512x512 atlas and load random shapes into `document.body`
every second:

```js
// Specify a width and height of the starting atlas
var atlas = require('atlaspack')(512, 512);

(function loop() {
  var width  = Math.random() * 32;
  var height = Math.random() * 32;

  var node = atlas.pack({width: width, height: height});

  var div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.width  = width + 'px';
  div.style.height = height + 'px';
  div.style.left   = node.rect.x + 'px';
  div.style.top    = node.rect.y + 'px';
  document.body.appendChild(div);

  setTimeout(loop, 1000);
}());
```

## api

### `atlaspack([...])`
Takes either 1 `canvas` argument, 2 `width, height` arguments or 4
`x, y, width, height` arguments. Returns an instance of `Atlas`.

### `atlaspack.Atlas([...])`
Takes either 1 `canvas` argument, 2 `width, height` arguments or 4
`x, y, width, height` arguments.

#### `atlas.pack(rect || image || object)`
Recursively tries to pack `rect` (or `image`, `object`) into the atlas. Will
return `false` if fails to fit the `rect` otherwise will return the atlas node
the `rect` has been packed into:

```js
var Atlas = require('atlaspack').Atlas;
var Rect = require('atlaspack').Rect;

var atlas = new Atlas(128, 128), node;

node = atlas.pack(new Rect(0, 0, 32, 32));
node = atlas.pack({x: 0, y: 0, w: 32, h: 32});

var img = new Image();
img.src = 'myimage.png';
img.onload = function() {
  node = atlas.pack(img);
};
```

#### `atlas.expand(rect || img || object)`
Will recursively expand the `atlas` to fit a new `rect` then pack the `rect`
into the expanded `atlas`. Returns the newly expanded `atlas`:

```js
var atlas = require('atlaspack')(128, 128);
var dontfit = {x: 0, y: 0, w: 256, h: 256};
var node = atlas.pack(dontfit);
if (node === false) {
  atlas = atlas.expand(dontfit);
}
```

#### `atlas.index()`
Returns a flat array of `rect`s which have images within the atlas. Useful for
retrieving an atlas key:

```js
var atlas = require('atlaspack')(128, 128);

function done() {
  atlas.index().forEach(function(rect) {
    console.log('Name: ' + rect.name);
    console.log('Coords: ' + rect.x + ', ' + rect.y);
  });
}

for (var i = 0; i < 100; i++) {
  var img = new Image();
  img.src = 'images/' + i + '.png';

  // Will use the id || name || src of the image as the rect.name
  img.id = i;

  img.onload = function() {
    atlas.pack(img);
    if (i === 99) done();
  };
}
```

#### `atlas.uv()`
Returns an object with rect names as keys containing an array of UV mapping
coordinates between 0-1 with TRBL:

```js
var uvmap = atlas.uv();
/* {
              TOP   RIGHT  BOTTOM  LEFT
  'name':  [ [0,0], [1,0], [1,1], [0,1] ],
} */
```

### `atlaspack.Rect(x, y, w, h)`
Creates a rectangle instance.

#### `rect.fitsIn(rect)`
Returns a `boolean` whether a `rect` fits within another `rect`.

#### `rect.sameSizeAs(rect)`
Returns a `boolean` whether a `rect` is the same size as another `rect`.

## install
With [npm](http://npmjs.org) do:

```
npm install atlaspack
```

## release history
* 0.2.1 - Add uv method for uv coordinates.
* 0.2.0 - Add expand and index methods.
* 0.1.0 - initial release

## license
Copyright (c) 2013 Kyle Robinson Young<br/>
Licensed under the MIT license.
