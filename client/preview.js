var d3 = require("d3"),
    audio = require("./audio.js"),
    video = require("./video.js"),
    minimap = require("./minimap.js"),
    sampleWave = require("./sample-wave.js"),
    getRenderer = require("../renderer/"),
    dataURItoBlob = require("datauritoblob"),    
    getWaveform = require("./waveform.js");

var context = d3.select("canvas").node().getContext("2d");

var theme,
    caption,
    audioFile,
    imageFile,
    selection,
    backgroundImageFileOverride;

function _audioFile(_) {
  return arguments.length ? (audioFile = _) : audioFile;
}

function _imageFile(_) {
  return arguments.length ? (imageFile = _) : imageFile;
}

function _theme(_) {
  return arguments.length ? (theme = _, redraw()) : theme;
}

function _caption(_) {
  return arguments.length ? (caption = _, redraw()) : caption;
}

function _selection(_) {
  return arguments.length ? (selection = _) : selection;
}

minimap.onBrush(function(extent){

  var duration = audio.duration();

  selection = {
    duration: duration * (extent[1] - extent[0]),
    start: extent[0] ? extent[0] * duration : null,
    end: extent[1] < 1 ? extent[1] * duration : null
  };

  d3.select("#duration strong").text(Math.round(10 * selection.duration) / 10)
    .classed("red", theme && theme.maxDuration && theme.maxDuration < selection.duration);

});

// Resize video and preview canvas to maintain aspect ratio
function resize(width, height) {

  var widthFactor = 640 / width,
      heightFactor = 360 / height,
      factor = Math.min(widthFactor, heightFactor);

  d3.select("canvas")
    .attr("width", factor * width)
    .attr("height", factor * height);

  d3.select("#canvas")
    .style("width", (factor * width) + "px");

  d3.select("video")
    .attr("height", widthFactor * height);

  d3.select("#video")
    .attr("height", (widthFactor * height) + "px");

  context.setTransform(factor, 0, 0, factor, 0, 0);

}

// Modify the preview wave to match the theme samples per frame
function selectPreviewPoints(samplePoints) {
  
  //Compress waveform to theme width and pick points at sample rate
  var previewWave = [];

  var sampleDelta = parseInt(samplePoints.length/theme.samplesPerFrame);
  
  console.log("Delta: " + sampleDelta);

  for (var i=0; i < samplePoints.length; i++) {
    if (i%sampleDelta == 0) {
      console.log(i);
      console.log(samplePoints[i]);
      var point = [ samplePoints[i][0], samplePoints[i][1] ];
      previewWave.push(point);
    }
  }
  return previewWave;
}

function redraw() {

  resize(theme.width, theme.height);

  video.kill();

  var renderer = getRenderer(theme);

  renderer.backgroundImage(backgroundImageFileOverride || theme.backgroundImageFile || null);
  
  var samplePoints = sampleWave;
  
  console.log(samplePoints);

  previewWave = selectPreviewPoints(samplePoints);

  console.log(previewWave);
  
  renderer.drawFrame(context, {
    caption: caption,
    waveform: previewWave,      // sampleWave,
    frame: 0
  });

}

function loadAudio(f, cb) {

  d3.queue()
    .defer(getWaveform, f)
    .defer(audio.src, f)
    .await(function(err, data){

      if (err) {
        return cb(err);
      }

      audioFile = f;
      minimap.redraw(data.peaks);

      cb(err);

    });
}

function loadImage(f, cb) {
  imageFile = f;
  setBackgroundImageOverride(f)
}

function setBackgroundImageOverride(customImage) {
  // if custom image field is empty, clear the override field
  if (!customImage) {
    backgroundImageFileOverride = undefined
    redraw()
    return;
  }
  backgroundImageFileOverride = new Image();
  backgroundImageFileOverride.src = URL.createObjectURL(customImage); 
  backgroundImageFileOverride.onload = function(){
    redraw()
  };
  backgroundImageFileOverride.onerror = function(e){
    console.warn(e);
  };
}

module.exports = {
  caption: _caption,
  theme: _theme,
  audioFile: _audioFile,
  imageFile: _imageFile,
  selection: _selection,
  loadAudio: loadAudio,
  loadImage: loadImage
};
