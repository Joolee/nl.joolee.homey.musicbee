var mcastPort = 45345;
var mcastGroup = '239.1.5.10';

var localAddress = null;
var setupEvents = null;
var server = null;
var broadcastInterval = null;
var MusicBeeTCP = require('../../lib/mbrc-tcp');
var devices = null;


module.exports.init = function(Hdevices, callback) {
	devices = Hdevices;
	Homey.log(devices);
	
	devices.forEach(initDevice);

	callback(null, true);
	return;
};

function triggerDevice(eventName, tokens, state, device_data, callback) {
	console.log('Triggered ' + eventName + ' for ' + device_data.id);
	if(typeof callback !== 'function')
	{
		callback = function(err, result){
			if( err ) return Homey.error(err);
		}
	}
	
	Homey.manager('flow').triggerDevice(eventName, tokens, state, device_data, callback);
}

function initDevice(device_data, callback) {
	module.exports.getSettings( device_data, function( err, settings ){
		console.log("Initialising " + device_data.id, settings);
		module.exports.setUnavailable( device_data, "Could not connect to " + settings.ip );
		
		var device = new MusicBeeTCP(device_data, settings);

		device.cachedPlayerStatus = {
			playerrepeat: null,
			playermute: null,
			playershuffle: null,
			scrobbler: null,
			playerstate: null,
			playervolume: null
		};
		
		device.cachedNowPlaying = {
			artist: null,
			album: null,
			title: null,
			year: null,
			rating: null,
			lfmrating: null,
			lyrics: null,
			cover: null,
			position: null
		};


		var volumeTimer = null;
		var volumeChanged = function() {
			triggerDevice( 'volume_changed', {volume: device.cachedPlayerStatus.playervolume}, null, device_data);
		}

		device.on('error', function(exception) {
			// Don't really need this but there must always be a listener to 'error' events!
		});

		
		device.on('connected', function(source, playerStatus) {
			console.log('Device connected!');
			module.exports.setAvailable( device_data );
			
			triggerDevice( 'connected', null, null, device_data);
		});

		device.on('disconnected', function(source, playerStatus) {
			console.log('Device disconnected :(');
			module.exports.setUnavailable( device_data, "Could not connect to " + settings.ip);

			triggerDevice( 'disconnected', null, null, device_data);
		});

		device.on('statusChanged', function(source, playerStatus) {
			if(device.cachedPlayerStatus.playerstate === null && settings.trigger_player == 'false')
			{
				console.log('trigger_player = \'false\' so only record the change for now.', playerStatus);
				Object.assign(device.cachedPlayerStatus, playerStatus);
				return;
			}
			
			if(JSON.stringify(device.cachedPlayerStatus) != JSON.stringify(playerStatus))
			{
				if(device.cachedPlayerStatus.playerstate !== playerStatus.playerstate)
				{
					triggerDevice( 'state_changed', { playingState: playerStatus.playerstate }, null, device_data);
					
					// Triggers played/paused and stopped flows
					triggerDevice( playerStatus.playerstate.toLowerCase(), null, null, device_data);
				}
				
				if(device.cachedPlayerStatus.playervolume !== playerStatus.playervolume)
				{
					// Volume often changes multiple times in a short period. Cache changes for 500ms.
					if(volumeTimer !== null)
					{
						clearTimeout(volumeTimer);
					}
					volumeTimer = setTimeout(volumeChanged, 500);
				}
				
				if(device.cachedPlayerStatus.playermute !== playerStatus.playermute)
				{
					triggerDevice( 'mute_changed', {muteState: playerStatus.playermute}, null, device_data);
				}
				
				if(device.cachedPlayerStatus.playershuffle !== playerStatus.playershuffle)
				{
					triggerDevice( 'shuffle_changed', {shuffleState: playerStatus.playershuffle}, null, device_data);
				}
				
				if(device.cachedPlayerStatus.playerrepeat !== playerStatus.playerrepeat)
				{
					triggerDevice( 'repeat_changed', {repeatState: playerStatus.playerrepeat}, null, device_data);
				}
				console.log('Device status changed!', playerStatus);
				Object.assign(device.cachedPlayerStatus, playerStatus);
			}
		});

		// device.on('positionUpdate', function(source, position) {
			// console.log('Device position changed!', source, position);
		// });

		device.on('trackChanged', function(source, nowPlaying) {
			if(device.cachedNowPlaying.title === null && settings.trigger_track == 'false')
			{
				console.log('trigger_track = \'false\' so only record the change for now.', nowPlaying);
				Object.assign(device.cachedNowPlaying, nowPlaying);
				return;
			}
			
			if(device.cachedNowPlaying.title !== nowPlaying.title)
			{
				var tokens = nowPlaying;
				tokens.length = Math.floor(tokens.position.total / 1000);
				triggerDevice( 'track_changed', nowPlaying, null, device_data);
				
				console.log('Device track changed!', source, nowPlaying);
			}
			else
			{
				if(device.cachedNowPlaying.rating != nowPlaying.rating)
				{
					triggerDevice( 'rating_changed', {rating: nowPlaying.rating}, null, device_data);
				}
			}
			Object.assign(device.cachedNowPlaying, nowPlaying);
		});
		
		device.on('stopped_after_current', function(source, nowPlaying) {
			triggerDevice( 'stopped_after_current', null, null, device_data);
		});
		
		devices[device_data.id] = device;
		
		if(typeof(callback) == 'function')
		{
			callback(device);
		}
	});
}

Homey.manager('flow').on('condition.active', function( callback, args ){
    callback( null, devices[args.device.id].getConnected() );
});

Homey.manager('flow').on('condition.playing', function( callback, args ){
    callback( null, devices[args.device.id].getPlayerStatus().playerstate == args.playingStatus );
});

Homey.manager('flow').on('condition.muted', function( callback, args ){
    callback( null, devices[args.device.id].getPlayerStatus().playermute );
});

Homey.manager('flow').on('condition.repeat', function( callback, args ){
    callback( null, devices[args.device.id].getPlayerStatus().playerrepeat == args.repeatStatus );
});

Homey.manager('flow').on('condition.shuffle', function( callback, args ){
    callback( null, devices[args.device.id].getPlayerStatus().playershuffle == args.shuffleStatus );
});

Homey.manager('flow').on('action.play', function( callback, args ){
    devices[args.device.id].play();
    callback( null, true );
});

Homey.manager('flow').on('action.pause', function( callback, args ){
    devices[args.device.id].pause();
    callback( null, true );
});

Homey.manager('flow').on('action.play_pause', function( callback, args ){
    devices[args.device.id].playPause();
    callback( null, true );
});

Homey.manager('flow').on('action.stop', function( callback, args ){
    devices[args.device.id].stop();
    callback( null, true );
});

Homey.manager('flow').on('action.next', function( callback, args ){
    devices[args.device.id].next();
    callback( null, true );
});

Homey.manager('flow').on('action.previous', function( callback, args ){
    devices[args.device.id].previous();
    callback( null, true );
});

Homey.manager('flow').on('action.stop_finish', function( callback, args ){
    devices[args.device.id].stopFinish();
    callback( null, true );
});

Homey.manager('flow').on('action.set_rating', function( callback, args ){
    devices[args.device.id].setRating(args.rating);
    callback( null, true );
});

Homey.manager('flow').on('action.set_shuffle', function( callback, args ){
    devices[args.device.id].setShuffle(args.shuffleState);
    callback( null, true );
});

Homey.manager('flow').on('action.set_repeat', function( callback, args ){
	// 'Repeat One' is not supported by plugin :(
    devices[args.device.id].setRepeat(args.repeatState);
    callback( null, true );
});

module.exports.pair = function( socket ) {
    var EventEmitter = require('events').EventEmitter;
    setupEvents = new EventEmitter();
    var foundDevices = null;

    // Start finding local address to be used in device discovery
    Homey.manager('cloud').getLocalAddress(function (err, address) {
      if (!err && address) {
        localAddress = address.substr(0, address.indexOf(':'));
        console.log('Init: Found local address: ' + localAddress);

        // If setup has already started, continue now we have the local address
        if(foundDevices !== null) {
          setupEvents.emit("gotLocalAddress");
        }
      }
    });

// Automatic pair
    socket.on('list_devices', function( data, callback ){
      // list_devices event is triggered multiple times when you leave the page open
      if(server) {
        return;
      }

      foundDevices = [];

      if(localAddress) {
        setupEvents.emit("gotLocalAddress");
      }
      else {
        console.log("Local address not (yet?) found, keep waiting");
      }
    });

    setupEvents.on('gotLocalAddress', function() {
      console.log("Setup: Continue with local address: "+ localAddress);

      // Create socket to communicate with the multicast group
      var dgram = require('dgram');
      server = dgram.createSocket("udp4");

      // After server.bind() has completed and the server is listening
      server.on('listening', function( ) {
        console.log('Setup: Listening to messages in group ' + mcastGroup);
        server.setMulticastTTL(128);
        server.setBroadcast(true);
        server.addMembership(mcastGroup);
        broadcastNew();
        broadcastInterval = setInterval(broadcastNew, 3000);
      });

      // When the server receives a reply
      server.on('message', function( message, rinfo ) {
        console.log("Setup: Receive: "+ message);
        message = JSON.parse(message);

        if(message.context == 'notify') {
          var id = message.address + ':' + message.port + '/' + Math.random();

          for (var index = 0; index < foundDevices.length && id; ++index) {
            if (foundDevices[index].settings.ip == message.address && foundDevices[index].settings.port == message.port) {
              id = null;
            }
          }

          if(id) {
            var device = {
                "name": message.name.toLowerCase() + " (" + message.address + ")",
                "data": {
                  "id": id
                },
				"settings": {
                  "ip": message.address,
                  "port": message.port					
				}
              };
            foundDevices.push(device);
            socket.emit('list_devices', [ device ])
            console.log("Setup: Found device " + JSON.stringify(device));
          }
        }
        else {
          console.log("Setup: Got strange packet " + JSON.stringify(message));
        }
      })

      // Start server
      server.bind();

      // Send discovery  message to multicast group
      function broadcastNew() {
          var message = new Buffer(JSON.stringify({'context': 'discovery','address':localAddress}));
          server.send(message, 0, message.length, mcastPort, mcastGroup);
          console.log("Setup: Send: "+ message);
      }
    });

    socket.on('disconnect', function(){
        if(broadcastInterval) {
          clearInterval(broadcastInterval);
        }

        if(server) {
          server.close();
          server = null;
        }

        console.log("User aborted pairing, or pairing is finished");
    });
// End automatic pair

  socket.on('getip', function( data, callback ) {
	  callback(localAddress);
  });


  socket.on('connect', function( data, callback ) {
    console.log("Setup: Test connection to " + data.ip + ":" + data.port);
	var device = new MusicBeeTCP('test', {ip: data.ip, port: data.port});

	device.on('connected', function(source) {
		console.log('Test successfull!');
		
		// Wait one second for track info
		setTimeout(replyConnected, 1000);
	});
	
	function replyConnected(source, nowPlaying)
	{
		if(device != null)
		{
			socket.emit('connected', nowPlaying);

			device.close();
			device=null;
		}
	}
	
	device.on("trackChanged", replyConnected);
	
	function onError(source, errorData) {
		console.log('Test failed!', source, errorData);
		socket.emit('failed', __("pair.error", { "address": data.ip + ':' + data.port }));
		device.close();
		device.removeAllListeners();
		device=null;
	}
	
	device.on('timeout', onError);
	device.on('error', onError);
	device.on('closed', onError);
  });
};


// run when a device has been added by the user (as of v0.8.33)
module.exports.added = function( device_data, callback ) {
	console.log('Added device: ' + device_data.id);
	initDevice(device_data);
};

// run when the user has renamed the device in Homey.
// It is recommended to synchronize a device's name, so the user is not confused
// when it uses another remote to control that device (e.g. the manufacturer's app).
module.exports.renamed = function( device_data, new_name ) {
	console.log('Renamed device: ' + device_data.id);
	console.log(device.name + ' => ' + new_name);
};

// run when the user has deleted the device from Homey
module.exports.deleted = function( device_data ) {
	console.log('Removed device: ' + device_data.id);
	devices[device_data.id].close();
	devices[device_data.id].removeAllListeners();
	devices[device_data.id]=null;
};

module.exports.settings = function( device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback ) {
	console.log('Settings changed. Reinitialising device.', changedKeysArr);
	devices[device_data.id].close();
	devices[device_data.id].removeAllListeners();
	devices[device_data.id]=null;
	callback( null, true );
	initDevice(device_data);
};
