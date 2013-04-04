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

// append image/rect to the atlas
Atlas.prototype.append = function(rect) {
  // if rect is an image
  if (rect.nodeName && rect.nodeName === 'IMG') {
    this.img = rect;
    rect = new Rect(rect.x, rect.y, rect.width, rect.height);
  }
  // if rect is an object
  if (!(rect instanceof Rect)) {
    rect = new Rect(rect.x || 0, rect.y || 0, rect.w || rect.width, rect.h || rect.height);
  }
  if (this.left !== null) {
    return this._ontoCanvas(this.left.append(rect) || this.right.append(rect));
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
  return this._ontoCanvas(this.left.append(rect));
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
