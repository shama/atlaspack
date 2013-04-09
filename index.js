/*
 * atlaspack
 * https://github.com/shama/atlaspack
 *
 * Copyright (c) 2013 Kyle Robinson Young
 * Licensed under the MIT license.
 *
 * Based on Nick Welch's binpack: https://github.com/mackstann/binpack
 */

function Rect(x, y, w, h) {
  this.x = x; this.y = y;
  this.w = w; this.h = h;
}

Rect.prototype.fitsIn = function(outer) {
  return outer.w >= this.w && outer.h >= this.h;
};

Rect.prototype.sameSizeAs = function(other) {
  return this.w === other.w && this.h === other.h;
};

function Atlas(x, y, w, h) {
  if (arguments.length === 1) {
    this.canvas = x;
    x = y = 0;
    w = this.canvas.width;
    h = this.canvas.height;
  }
  if (arguments.length === 2) {
    w = x; h = y; x = y = 0;
  }
  this.left = this.right = null;
  this.rect = new Rect(x, y, w, h);
  this.filled = false;
}
module.exports = function() {
  if (arguments.length === 1) { return new Atlas(arguments[0]); }
  if (arguments.length === 2) { return new Atlas(arguments[0], arguments[1]); }
  return new Atlas(arguments[0], arguments[1], arguments[2], arguments[3]);
};
module.exports.Atlas = Atlas;
module.exports.Rect = Rect;

// pack image/rect to the atlas
Atlas.prototype.pack = function(rect) {
  rect = this._toRect(rect);
  if (this.left !== null) {
    return this._ontoCanvas(this.left.pack(rect) || this.right.pack(rect));
  }
  // if atlas filled or wont fit
  if (this.filled || !rect.fitsIn(this.rect)) {
    return false;
  }
  // if this atlas has been filled
  if (rect.sameSizeAs(this.rect)) {
    this.filled = true;
    return this._ontoCanvas(this);
  }
  if ((this.rect.w - rect.w) > (this.rect.h - rect.h)) {
    this.left = new Atlas(this.rect.x, this.rect.y, rect.w, this.rect.h);
    this.right = new Atlas(this.rect.x + rect.w, this.rect.y, this.rect.w - rect.w, this.rect.h);
  } else {
    this.left = new Atlas(this.rect.x, this.rect.y, this.rect.w, rect.h);
    this.right = new Atlas(this.rect.x, this.rect.y + rect.h, this.rect.w, this.rect.h - rect.h);
  }
  return this._ontoCanvas(this.left.pack(rect));
};

Atlas.prototype.grow = function(rect) {
  var self = this;
  rect = this._toRect(rect);

  var atlas;
  if (this.rect.w < this.rect.h) {
    atlas = new Atlas(0, 0, this.rect.w + rect.w, this.rect.h);
    atlas.right = new Atlas(this.rect.w, 0, rect.w, this.rect.h);
    atlas.left = this;
  } else {
    atlas = new Atlas(0, 0, this.rect.w, this.rect.h + rect.h);
    atlas.right = new Atlas(0, this.rect.h, this.rect.w, rect.h);
    atlas.left = this;
  }

  ['canvas', 'context', 'img'].forEach(function(p) {
    if (self[p]) {
      atlas[p] = self[p];
      self[p] = null;
    }
  });

  // resize canvas
  if (atlas.canvas) {
    if (!atlas.context) {
      atlas.context = atlas.canvas.getContext('2d');
    }
    var old = atlas.context.getImageData(0, 0, atlas.canvas.width, atlas.canvas.height);
    atlas.canvas.width = atlas.rect.w;
    atlas.canvas.height = atlas.rect.h;
    atlas.context.putImageData(old, 0, 0);
  }

  return (atlas.pack(rect) === false) ? atlas.grow(rect) : atlas;
};

// if has an image and canvas, draw to the canvas as we go
Atlas.prototype._ontoCanvas = function(node) {
  if (node && this.img && this.canvas) {
    if (!this.context) {
      this.context = this.canvas.getContext('2d');
    }
    this.context.drawImage(this.img, node.rect.x, node.rect.y, node.rect.w, node.rect.h);
  }
  return node;
};

// make sure we're always working with rects
Atlas.prototype._toRect = function(rect) {
  // if rect is an image
  if (rect.nodeName && rect.nodeName === 'IMG') {
    this.img = rect;
    rect = new Rect(rect.x, rect.y, rect.width, rect.height);
  }
  // if rect is an object
  if (!(rect instanceof Rect)) {
    rect = new Rect(rect.x || 0, rect.y || 0, rect.w || rect.width, rect.h || rect.height);
  }
  return rect;
};

Atlas.prototype._debug = function() {
  if (!this.canvas) { return; }
  var context = this.canvas.getContext('2d');
  var rects = [];
  (function loop(atlas) {
    rects.push(atlas.rect);
    if (atlas.left !== null) {
      loop(atlas.left);
      loop(atlas.right);
    }
  }(this));
  rects.forEach(function(rect) {
    context.lineWidth = 1;
    context.strokeStyle = 'red';
    context.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
};
