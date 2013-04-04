// create a canvas
var canvas = document.createElement('canvas');
document.body.appendChild(canvas);
canvas.width = 800;
canvas.height = 533;

// create an atlas with our canvas
var atlas = require('../')(canvas);

// add images to our atlas
var texturePath = 'node_modules/painterly-textures/textures/';
[
  'dirt', 'grass', 'grass_dirt',
  'obsidian', 'plank', 'whitewool',
  'crate', 'bedrock', 'bluewool', 'cobblestone',
  'brick', 'diamond', 'glowstone',
  'netherrack', 'redwool',
].forEach(function(name) {
  var img = new Image();
  img.src = texturePath + name + '.png';
  img.onload = function() {
    atlas.append(img);
  };
});

// handle drag and drop
if (typeof window.FileReader === 'undefined') {
  alert('Sorry your browser doesn\'t support drag and drop files.');
}
canvas.ondragover = function() { this.className = 'active'; return false; };
canvas.ondragend = function() { this.className = ''; return false; };
canvas.ondrop = function (e) {
  e.preventDefault();
  this.className = '';
  for (i in e.dataTransfer.files) {
    var file = e.dataTransfer.files[i];
    if (!(file instanceof File)) { continue; }
    var reader = new FileReader();
    reader.onload = function(event) {
      var img = new Image();
      img.src = event.target.result;
      img.onload = function() {
        atlas.append(img);
      };
    };
    reader.readAsDataURL(file);
  }
  return false;
};

// handle exporting atlas
var saveas = document.querySelector('#export');
saveas.onclick = function(e) {
  e.preventDefault();
  window.open(canvas.toDataURL());
  return false;
};
