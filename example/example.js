// create a canvas
var canvas = document.createElement('canvas');
document.body.appendChild(canvas);
canvas.width = 128;
canvas.height = 128;

// create an atlas with our canvas
var createAtlas = require('../');
var atlas = createAtlas(canvas);
//atlas.tilepad = true;

function atlasPack(img) {
  var node = atlas.pack(img);
  if (node === false) {
    atlas = atlas.expand(img);
    //atlas.tilepad = true;
  }
}

// add images to our atlas
var texturePath = 'node_modules/painterly-textures/textures/';
[
  'dirt', 'grass', 'grass_dirt',
  'obsidian', 'plank', 'whitewool',
  'crate',
  'bedrock', 'bluewool', 'cobblestone',
  'brick', 'diamond', 'glowstone',
  'netherrack', 'redwool',
].forEach(function(name) {
  var img = new Image();
  img.id = name;
  img.src = texturePath + name + '.png';
  img.onload = function() {
    atlasPack(img);
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
        atlasPack(img);
      };
    };
    reader.readAsDataURL(file);
  }
  return false;
};

// handle exporting atlas
document.querySelector('#export').onclick = function(e) {
  e.preventDefault();
  window.open(canvas.toDataURL());
  return false;
};

// handle exporting atlas key
document.querySelector('#json').onclick = function(e) {
  e.preventDefault();
  window.open('data:application/json,' + escape(atlas.json()));
  return false;
};

// reset atlas
document.querySelector('#reset').onclick = function(e) {
  e.preventDefault();
  if (window.confirm('Are you sure?')) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 128; canvas.height = 128;
    atlas = createAtlas(canvas);
  }
  return false;
};
