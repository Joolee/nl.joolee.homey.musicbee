const util         = require("util");
const EventEmitter = require('events');

function MusicBee(ip, port) {
  this.ip = ip;
  this.port = port;
  console.log("Connect to " + ip + ":" + port);
}

MusicBee.prototype.getNowPlaying = function() {
  console.log("Get nowplaying from " + this.ip + ":" + this.port);
}

util.inherits(MusicBee, EventEmitter);
module.exports = MusicBee;
