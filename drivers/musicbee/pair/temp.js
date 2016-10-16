console.log("Connecting to: " + device.ip + ":" + device.port);
var net = require('net');

var client = new net.Socket();
client.setEncoding('utf8');
client.connect(device.port, device.ip);

function msg(socket, context, data) {
  var message = JSON.stringify({'context': context, 'data': data});
  client.write(message);
  console.log("Send: " + message);
}

client.on('connect', function() {
  console.log('Connected to ' + client.remoteAddress + ":" + client.remotePort);
  msg(client, 'player', 'Homey');
})

var packetCounter = 0;
var buffer = '';
client.on('data', function(data) {
  packet = "" + buffer + data;

  // Alle messages should end with a (windows) newline
  // Otherwise, only part of the message was received.
  // In that case, buffer data to prepend to next message.
  if (packet.substr(-2) == "\r\n") {
    buffer = '';

    // Data may consist of multiple json objects, devided by one
    // or two (windows) newlines
    // \0 Was probably removed by the Net package but just in case, remove it.
    var messages = packet.trim().replace("\0","").split("\r\n").filter(Boolean);
    for(i=0; i < messages.length; i++) {
      try {
        var message = JSON.parse(messages[i]);
      } catch(e) {
        console.log("Received malformed message "+ e +"\r\n" + messages[i]);
      }

      if(message)
        client.emit("message", message, packetCounter, i+1, messages.length);
    }

    packetCounter++;
  }
  else {
    console.log("Received partial message (length: "+data.length +")");
    buffer = packet;
  }
})

client.on('message', function(message, packet, messageNum, messageCount) {
  var log = JSON.stringify(message);
  if(log.length > 200)
    log = log.substr(0,200) + "[...]";

  console.log("Received "+packet+" "+messageNum+"/"+messageCount+": " + log);
  log = undefined;

  switch(message.context) {
    case 'player':
      msg(client, 'protocol', '2.1');
    break;

    case 'protocol':
      msg(client, 'init', '');
//        setTimeout(function() {
//          msg(client, 'nowplayinglyrics', '')
//        }, 5000);
    break;

    case 'nowplayinglyrics':
      console.log('Lyrics: ' + message.data);
    break;

    case 'ping':
      msg(client, 'pong', '');
    break;

    default:
    console.log("  > Ignored for now");
  }
});

client.on('close', function() {
  console.log('Connection closed');
});

client.on('end', function() {
  console.log('Connection ended');
});

client.on('error', function() {
  console.log('Connection error');
});

client.on('timeout', function() {
  console.log('Connection timeout');
});
callback(null, true);
