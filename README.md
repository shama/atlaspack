# atlaspack

Pack images into a texture atlas. View the
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
  img.src = 'images/' + i + '.png';
  img.onload = function() {
    atlas.append(img);
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

  var node = atlas.append({width: width, height: height});

  var div = document.createElement('div');
  div.style.width  = width + 'px';
  div.style.height = height + 'px';
  div.style.left   = node.rect.x + 'px';
  div.style.top    = node.rect.y + 'px';
  document.body.appendChild(div);

  setTimeout(loop, 1000);
}());
```

## install
With [npm](http://npmjs.org) do:

```
npm install atlaspack
```

## release history
* 0.1.0 - initial release

## license
Copyright (c) 2013 Kyle Robinson Young<br/>
Licensed under the MIT license.
