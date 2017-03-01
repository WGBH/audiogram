var fs = require("fs"),
    path = require("path"),
    Canvas = require("canvas"),
    getRenderer = require("../renderer/");

function initializeCanvas(theme, expectedOverridePath, cb) {

  // Fonts pre-registered in bin/worker
  var renderer = getRenderer(theme);

  // Check if a background image exists at the expected override path
  if (expectedOverridePath && fs.existsSync(expectedOverridePath)) {
    backgroundToUse = expectedOverridePath
  } else if (theme.backgroundImage) {
    backgroundToUse = path.join(__dirname, "..", "settings", "backgrounds", theme.backgroundImage)
  } else {
    return cb(null, renderer);
  }


  // Load background image from file (done separately so renderer code can work in browser too)
  fs.readFile(backgroundToUse, function(err, raw){

    if (err) {
      return cb(err);
    }

    var bg = new Canvas.Image;
    bg.src = raw;
    renderer.backgroundImage(bg);

    return cb(null, renderer);

  });

}

module.exports = initializeCanvas;
