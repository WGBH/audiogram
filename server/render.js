var serverSettings = require("../lib/settings/"),
    spawn = require("child_process").spawn,
    path = require("path"),
    _ = require("underscore"),
    logger = require("../lib/logger"),
    transports = require("../lib/transports");

function validate(req, res, next) {


  try {

    req.body.theme = JSON.parse(req.body.theme);

  } catch(e) {

    return res.status(500).send("Unknown settings error.");

  }
  
  if (!req.files['audio'] || !req.files['audio'][0] || !req.files['audio'][0].filename) {
    return res.status(500).send("No valid audio received.");
  }

  // if audio file is bigger than limit, throw error
  if (serverSettings.maxAudioUploadSize && 
      req.files['audio'][0].size > serverSettings.maxAudioUploadSize)
  {
    return res.status(500).send(
      "The original audio file cannot be bigger than " +
      serverSettings.maxAudioUploadSize / 1000000 + " MB.");
  }

  // if image file is bigger than limit, throw error
  if (serverSettings.maxImageUploadSize &&
      req.files['image'] &&
      req.files['image'][0] &&
      req.files['image'][0].size > serverSettings.maxImageUploadSize)
  {
    return res.status(500).send(
      "The background image file cannot be bigger than " +
      serverSettings.maxImageUploadSize / 1000000 + " MB.");
  }

  // Start at the beginning, or specified time
  if (req.body.start) {
    req.body.start = +req.body.start;
  }

  if (req.body.end) {
    req.body.end = +req.body.end;
  }

  return next();

}

function route(req, res) {

  var id = req.files['audio'][0].destination.split(path.sep).pop();

  if (req.files['image'] && req.files['image'][0] && req.files['image'][0].filename) {
    transports.upload(req.files['image'][0].path, "image/" + id , function(err) {
      if (err) {
        throw err;
      }
    });
  }

  transports.uploadAudio(req.files['audio'][0].path, "audio/" + id, function(err) {

    if (err) {
      throw err;
    }

    // Queue up the job with a timestamp
    transports.addJob(_.extend({ id: id, created: (new Date()).getTime() }, req.body));

    res.json({ id: id });

    // If there's no separate worker, spawn one right away
    if (!serverSettings.worker) {

      logger.debug("Spawning worker");

      // Empty args to avoid child_process Linux error
      spawn("bin/worker", [], {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
        env: _.extend({}, process.env, { SPAWNED: true })
      });

    }

  });

};

module.exports = {
  validate: validate,
  route: route
};
