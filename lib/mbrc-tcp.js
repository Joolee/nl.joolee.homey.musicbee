const util = require("util");
const EventEmitter = require('events');

// Events:
//   connected
//   songchange
//   statechange
function MusicBee(device_data, device_settings) {
	var self = this;
	var data = data;
	var ip = device_settings.ip;
	var port = device_settings.port;
	var socket = null;
	var net = require('net');
	var nowPlaying = null;
	var playerStatus = null;
	var events = [];
	var skipEvents = [];
	var pingInterval = null;
	var cover = {};
	var justStopped = false;
	var initTime = (new Date()).getTime();
	var closed = false;
	var connected = false;

	// Place this somewhere in app settings
	var timeout = 2000;
	var maxTimeout = 10000;
	var timeoutIncrement = .01;

	// Socket events
	function onConnect(data) {
		// Homey.log('Connected!');
		socket.setTimeout(maxTimeout);
		pingInterval = setInterval(function () {
				msg('ping', '')
			}, maxTimeout / 2);
		msg('player', 'Homey');
		
		connected = true;
		self.emit('connected');
	}

	function onClose(data) {
		Homey.log('Connection closed');
		connected = false;
		
		// If connecting succeeded once
		if (pingInterval) {
			self.emit('disconnected');
			clearInterval(pingInterval);
			pingInterval = null;
		}
		else
		{
			self.emit('closed');
		}

		socket.destroy();
		
		timeout *= timeoutIncrement + 1;
		timeout = timeout > maxTimeout ? maxTimeout : Math.round(timeout);
		setTimeout(connect, timeout);
	}

	function onEnd(data) {
		Homey.log('Connection ended', data);
		connected = false;
	}

	function onError(data) {
		Homey.log('Connection error', data);
		connected = false;
		self.emit('error', data);
	}

	function onTimeout() {
		connected = false;
		Homey.log('Connection timeout');
		self.emit('timeout');
		socket.destroy();
		timeout *= timeoutIncrement + 1;
		timeout = timeout > maxTimeout ? maxTimeout : Math.round(timeout);
	}

	var buffer = '';
	var processPacketTimer = null;
	function onData(data) {

		if (processPacketTimer) {
			// console.log('Look at me, I combined something :)', buffer.substr(-30), '#', data.substr(0,30));
			clearTimeout(processPacketTimer);
			processPacketTimer = null;
		}
		var packet = "" + buffer + data;

		// Alle messages should end with a (windows) newline
		// Otherwise, only part of the message was received.
		// In that case, buffer data to prepend to next message.
		if (packet.substr(-2) === "\r\n") {
			// See if more packages arrive within this time. They may belong together.
			processPacketTimer = setTimeout(function () {
					processPacket(buffer);
					buffer = '';
					processPacketTimer = null;
				}, 100);
		}
		// else {
		// console.log("Received partial message (length: "+data.length +")");
		// }

		buffer = packet;
	}

	var packetCounter = 0;
	function processPacket(packet) {
		// if(!(packet.length == 30 && (packet.indexOf('ping') > 0 || packet.indexOf('pong') > 0 ) ))
		// console.log('Process Packet', packetCounter, (new Date()).getTime() - initTime, packet.length);


		// Data may consist of multiple json objects, devided by one
		// or two (windows) newlines
		// \0 Was probably removed by the Net package but just in case, remove it.
		var rawMessages = packet.trim().replace("\0", "").split("\r\n").filter(Boolean);
		var messages = [];
		rawMessages.forEach(function (rawMessage) {
			try {
				var message = JSON.parse(rawMessage);
			} catch (e) {
				console.log("Received malformed message " + e + "\r\n" + rawMessage);
			}

			if (message) {
				messages.push(message);
			}
		});

		// Track information can be received in random order
		// If nowplayingtrack is one of the messages, the track has changed and all information needs to be reset
		// Reset the trackinformation so the 'trackChanged' event knows it might have to wait on additional information
		function findNowPlayingMessage(message) {
			return message.context == 'nowplayingtrack';
		}

		if (messages.find(findNowPlayingMessage)) {
			nowPlaying = {};
		}

		messages.forEach(function (message, index) {
			socket.emit("message", message, packetCounter, index + 1, messages.length);
		});

		flushEvents(packetCounter);

		packetCounter++;
	}

	// Actually emitted by onData, not a native socket event
	function onMessage(message, packet, messageNum, messageCount) {
		// var log = JSON.stringify(message);
		// if(log.length > 200)
		// {
		// log = log.substr(0,200) + "[...]";
		// }

		// if(message.context != 'ping' && message.context != 'pong')
		// {
		// console.log("Received "+packet+" "+messageNum+"/"+messageCount+": " + log);
		// }

		// log = undefined;

		switch (message.context) {
		case 'player':
			msg('protocol', '2.1');
			break;

		case 'protocol':
			msg('init', '');
			break;

		case 'nowplayingtrack':
			Object.assign(nowPlaying, {
				artist: message.data.Artist,
				album: message.data.Album,
				title: message.data.Title,
				year: message.data.Year
			});
			// console.log('nowplayingtrack', message.data);
			// Use the object instead of creating clones
			nowPlaying.cover = cover;
			// Skip certain events when track has changed
			addSkipEvent(positionUpdate, 'nowplayingposition');
			addSkipEvent(trackChanged, 'nowplayingcover');
			addSkipEvent(trackChanged, 'nowplayinglyrics');
			addSkipEvent(trackChanged, 'nowplayingrating');
			addSkipEvent(trackChanged, 'nowplayinglfmrating');
			queueEvent(trackChanged, 'nowplayingtrack');
			break;

		case 'nowplayinglyrics':
			nowPlaying.lyrics = message.data;
			queueEvent(trackChanged, 'nowplayinglyrics');
			break;

		case 'nowplayingrating':
			nowPlaying.rating = message.data;
			queueEvent(trackChanged, 'nowplayingrating');
			break;

			// Cover can be persistant between tracks
		case 'nowplayinglfmrating':
			nowPlaying.lfmrating = message.data;
			queueEvent(trackChanged, 'nowplayinglfmrating');
			break;

		case 'nowplayingcover':
			cover.length = message.data.length;
			// Cover is not updated when it is not changed
			// Let clients identify unchanged stuff through this unique ID
			cover.id = packetCounter;
			queueEvent(trackChanged, 'nowplayingcover');
			break;

		case 'playerstatus':
			playerStatus = message.data;
			queueEvent(statusChanged, 'playerstatus');
			break;

		case 'nowplayingposition':
			var position = Object.assign(message.data, {
					percent : message.data.current / message.data.total
				});
			nowPlaying = Object.assign(nowPlaying, {
					'position' : position
				});
			queueEvent(positionUpdate, 'nowplayingposition');
			break;

		case 'playervolume':
			playerStatus.playervolume = message.data;
			if(message.data == 0)
			{
				playerStatus.playermute = true;
			}
			else if(playerStatus.playermute == true)
			{
				playerStatus.playermute = false;
			}
			queueEvent(statusChanged, 'playervolume');
			break;

		case 'playerstate':
			playerStatus.playerstate = message.data;
			queueEvent(statusChanged, 'playerstate');
			break;

		case 'playershuffle':
			playerStatus.playershuffle = message.data;
			queueEvent(statusChanged, 'playershuffle');
			break;

		case 'playermute':
			playerStatus.playermute = message.data;
			queueEvent(statusChanged, 'playermute');
			break;

		case 'playerrepeat':
			playerStatus.playerrepeat = message.data;
			queueEvent(statusChanged, 'playerrepeat');
			break;

			// Untested
		case 'scrobbler':
			playerStatus.scrobbler = message.data;
			queueEvent(statusChanged, 'scrobbler');
			break;

		case 'ping':
			msg('pong', '');
			break;

			console.log("Received unknown " + packet + " " + messageNum + "/" + messageCount + ": " + log);
		}
	}

	// Internal functions
	function msg(context, data) {
		var message = JSON.stringify({
				'context' : context,
				'data' : data
			});
		socket.write(message);
		//console.log("Send: " + message);
	}

	function connect() {
		if(!closed)
		{
			socket = new net.Socket();
			socket.setEncoding('utf8');
			socket.setTimeout(timeout);
			socket.setKeepAlive(true);
			socket.on('connect', onConnect);
			socket.on('close', onClose);
			socket.on('end', onEnd);
			socket.on('error', onError);
			socket.on('timeout', onTimeout);
			socket.on('data', onData);
			socket.on('message', onMessage); // Actually called by 'onData'

			socket.connect(port, ip);
		}
	}
	
	function queueEvent(eventFunction, source) {
		events.push({
			eventFunction : eventFunction,
			source : source
		});
	}

	function flushEvents(packet) {
		//console.log('a', 'events', events, 'skipEvents', skipEvents);
		var activeEvents = events.splice(0).filter(function (activeEvent) {
				function findSkipEvent(skipEvent) {
					return skipEvent.eventFunction == activeEvent.eventFunction && skipEvent.source == activeEvent.source;
				}

				var skip = skipEvents.findIndex(findSkipEvent) < 0;
				// if (!skip) {
					// console.log('Skipping', activeEvent.eventFunction.name, activeEvent.source);
				// }

				return skip;
			})
			//console.log('b', 'activeEvents', activeEvents, 'skipEvents', skipEvents);


			activeEvents.forEach(function (value, index) {
				value.eventFunction(value.source);
			});
	}

	function trackChanged(source) {
		// If track changed but we don't know the now playing position, request it (once)
		// Re-queue trackChanged event
		if (!nowPlaying.hasOwnProperty('position')) {
			if (source != 'position-request') {
				// console.log('Track changed, requesting position');
				msg('nowplayingposition', '');
			}
			// else
			// {
			// console.log('Track changed, still no position');
			// }

			queueEvent(trackChanged, 'position-request');
		}
		// Rating sometimes fires one package before trackChanged is known. I could cache the old data in case it's missing but I can also just request it again:
		else if (!nowPlaying.hasOwnProperty('rating')) {
			if (source != 'rating-request') {
				// console.log('Track changed but missing rating, requesting now');
				msg('nowplayingrating', '');
			}
			queueEvent(trackChanged, 'rating-request');
		}
		// Never had lyrics missing in the trackChanged package but it can't hurt to doublecheck:
		else if (!nowPlaying.hasOwnProperty('lyrics')) {
			if (source != 'lyrics-request') {
				// console.log('Track changed but missing lyrics, requesting now');
				msg('nowplayinglyrics', '');
			}
			queueEvent(trackChanged, 'lyrics-request');
		} else {
			if (source == 'lyrics-request' || source == 'rating-request' || source == 'position-request') {
				source = 'nowplayingtrack';
			}
			// Start responding to other events again
			removeSkipEvent(positionUpdate, 'nowplayingposition');
			removeSkipEvent(trackChanged, 'nowplayingcover');
			removeSkipEvent(trackChanged, 'nowplayinglyrics');
			removeSkipEvent(trackChanged, 'nowplayingrating');
			removeSkipEvent(trackChanged, 'nowplayinglfmrating');

			self.emit('trackChanged', source, nowPlaying);
			// console.log('Track changed ('+source+')', nowPlaying, source);
		}
	}

	function addSkipEvent(eventFunction, source) {
		skipEvents.push({
			eventFunction : eventFunction,
			source : source
		});
	}

	function removeSkipEvent(eventFunction, source) {
		skipEvents = skipEvents.filter(function (skipEvent) {
			return !(skipEvent.eventFunction == eventFunction && skipEvent.source == source)
		})
	}

	function statusChanged(source) {

		if (source == 'playerstate' && playerStatus.playerstate == 'Playing' && justStopped) {
			// Could also be a manual seek
			// When seeking in MusicBee, playerstate events Paused and Playing are send but nowplayingposition is not updated
			// Just to be sure, do so anyway
			msg('nowplayingposition', '');
		} else if (source == 'playerstate' && playerStatus.playerstate == 'Stopped') {
			justStopped = true;
			setTimeout(function () {
				justStopped = false
			}, 1000)
		}

		self.emit('statusChanged', source, playerStatus);
	}

	function positionUpdate(source) {
		self.emit('positionUpdate', source, nowPlaying.position);
		// console.log('Position update', nowPlaying.position);
	}

	// Public
	self.getConnected = function() {
		return connected;
	}
	
	self.getNowPlaying = function() {
		return nowPlaying;
	}
	
	self.getPlayerStatus = function() {
		return playerStatus;
	}
	
	self.play = function () {
		console.log('Start playing');
	}

	self.close = function () {
		console.log("Closing device connection");
		closed=true;
		self.removeAllListeners();
		socket.destroy();
	}
	
	console.log("Init device with " + ip + ":" + port);
	connect();
}

util.inherits(MusicBee, EventEmitter);
module.exports = MusicBee;
