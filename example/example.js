(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {}
});

require.define("/index.js",function(require,module,exports,__dirname,__filename,process,global){/*
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
  this._cache = [];
  this._uvcache = Object.create(null);
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
  this._cache = [];
  this._uvcache = [];
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

Atlas.prototype.expand = function(rect) {
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

  return (atlas.pack(rect) === false) ? atlas.expand(rect) : atlas;
};

Atlas.prototype.index = function() {
  var self = this;
  if (self._cache.length > 0) {
    return self._cache;
  }
  (function loop(atlas) {
    if (atlas.left !== null) {
      loop(atlas.left);
      loop(atlas.right);
    } else if (atlas.rect.name) {
      self._cache.push(atlas.rect);
    }
  }(self));
  return self._cache;
};

Atlas.prototype.uv = function() {
  var self = this;
  if (self._uvcache.length > 0) {
    return self._uvcache;
  }
  (function loop(atlas) {
    if (atlas.left !== null) {
      loop(atlas.left);
      loop(atlas.right);
    } else if (typeof atlas.rect.name !== 'undefined') {
      self._uvcache[atlas.rect.name] = [
        [atlas.rect.x, atlas.rect.y],
        [atlas.rect.x + atlas.rect.w, atlas.rect.y],
        [atlas.rect.x + atlas.rect.w, atlas.rect.y + atlas.rect.h],
        [atlas.rect.x, atlas.rect.y + atlas.rect.h],
      ].map(function(uv) {
        if (uv[0] !== 0) {
          uv[0] = uv[0] / self.rect.w;
        }
        if (uv[1] !== 0) {
          uv[1] = uv[1] / self.rect.h;
        }
        return uv;
      });
    }
  }(self));
  return self._uvcache;
};

Atlas.prototype.json = function(input) {
  var self = this;
  if (input) {
    if (typeof input === 'string') input = JSON.parse(input);
    return (function loop(obj) {
      if (!obj || !obj.rect) return;
      var atlas = new Atlas(obj.rect.x, obj.rect.y, obj.rect.w, obj.rect.h);
      if (obj.left) atlas.left = loop(obj.left);
      if (obj.right) atlas.right = loop(obj.right);
      return atlas;
    }(input));
  } else {
    return JSON.stringify(function loop(atlas) {
      var obj = {
        left: null, right: null,
        rect: atlas.rect, filled: atlas.filled
      };
      if (atlas.left !== null) {
        obj.left = loop(atlas.left);
        obj.right = loop(atlas.right);
      }
      return obj;
    }(self), null, 2);
  }
};

// if has an image and canvas, draw to the canvas as we go
Atlas.prototype._ontoCanvas = function(node) {
  if (node && this.img && this.canvas) {
    if (!this.context) {
      this.context = this.canvas.getContext('2d');
    }
    this.context.drawImage(this.img, node.rect.x, node.rect.y, node.rect.w, node.rect.h);
    node.rect.name = this.img.id || this.img.name || this.img.src || null;
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
  this.index().forEach(function(rect) {
    context.lineWidth = 1;
    context.strokeStyle = 'red';
    context.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
};

});

require.define("/example/example.js",function(require,module,exports,__dirname,__filename,process,global){// create a canvas
var canvas = document.createElement('canvas');
document.body.appendChild(canvas);
canvas.width = 128;
canvas.height = 128;

// create an atlas with our canvas
var createAtlas = require('../');
var atlas = createAtlas(canvas);

function atlasPack(img) {
  var node = atlas.pack(img);
  if (node === false) {
    atlas = atlas.expand(img);
  }
}

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

});
require("/example/example.js");
})();
