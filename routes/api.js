var express = require('express');
var noble = require('noble');
var merge = require('merge');
var mqtt = require('mqtt');
var mqtt_connection = require('./mqtt_connect');
var sqlite3 = require('sqlite3').verbose();

var router = express.Router();

var mqtt_client = '';
var topic_rx = '';
var auto_discover = '';
var auto_connect = '';

setTimeout(function() {
  mqtt_client = mqtt_connection.mqtt_client;
  topic_rx = mqtt_connection.topic_rx;
  auto_discover = mqtt_connection.auto_discover;
  auto_connect = mqtt_connection.auto_connect;
  /* Activate MQTT on message listener */
  receiveData();
}, 5000);

var peripherals = {};
var write_characteristics = {};
var notify_characteristics = {};

var scanning = true;

setTimeout(function() {
  autoDiscover(auto_discover);
}, 6000);


/* /discover - discover devices */
router.get('/discover', function(req, res, next) {
  discoverDevices();

  setTimeout(function() {
    result = getDevices();
    res.json(result);
  }, 6000);
});


/* /devices - return the list of discovered devices */
router.get('/devices', function(req, res, next) {
  result = getDevices();
  res.json(result);
});


/* /connect - connect discovered device based on uuid as GET param */
router.post('/connect', function(req, res, next) {
  if (scanning == true) {
    res.json({
      response: "scanning in progress or no scan was performed"
    });
  }
  else {
    var uuid = req.body.uuid;

    connectDevice(uuid);

    setTimeout(function() {
      subscribeCharacteristic({uuid: notify_characteristics[uuid]});
      res.json({
        response: "ok"
      });
    }, 2500);
  }
});


/* /disconnect - disconnect discovered device based on uuid as GET param */
router.post('/disconnect', function(req, res, next) {
  var uuid = req.body.uuid;

  disconnectDevice(uuid);

  setTimeout(function() {
    res.json({
      response: "ok"
    });
  }, 2500);
});


/* /auto - auto_discover/auto_connect set mode */
router.post('/auto', function(req, res, next) {
  var auto_discover = req.body.auto_discover;
  var auto_connect = req.body.auto_connect;

  var db = new sqlite3.Database('gateway.db');

  db.serialize(function() {
    if (auto_discover != undefined) {
      var upt = db.prepare("UPDATE configs SET auto_discover = ? WHERE auto_discover = ?");
      if (auto_discover == 'true') {
        upt.run(true, false);
      } else if (auto_discover == 'false') {
        upt.run(false, true);
      }
      upt.finalize();
    }

    if (auto_connect != undefined) {
      var upt = db.prepare("UPDATE configs SET auto_connect = ? WHERE auto_connect = ?");
      if (auto_connect == 'true') {
        upt.run(true, false);
      } else if (auto_connect == 'false') {
        upt.run(false, true);
      }
      upt.finalize();
    }
  });

  db.close();

  setTimeout(function() {
    res.json({
      response: "ok"
    });
  }, 1000);
});


/* TO BE REMOVED - just for testing purpose */
router.post('/tx', function(req, res, next) {
  var uuid = req.body.uuid;
  var payload = req.body.payload;

  // var message = sendMessage(uuid, payload);
  var message = sendBroadcast(payload);
  setTimeout(function() {
    res.json({
      "message": message
    });
  }, 2000);
});


function scanForPeripherals(state) {
  if (state === 'poweredOn') {
    console.log("start scanning");
    noble.startScanning([], true);
  } else { // if Bluetooth is off
    noble.stopScanning(); // stop scanning
    console.log("Please check that Bluetooth is turned on.");
  }
}


function readPeripheral(peripheral) {
  device = peripheral;
  console.log('device uuid: ' + device.uuid);
  peripherals[device.uuid] = device;
}


function connectDevice(uuid) {
  if (uuid in peripherals && peripherals[uuid].state == 'disconnected' && scanning != true) {
    device = peripherals[uuid];
    console.log("Connect: " + device.uuid);
    device.connect(); // attempt to connect to peripheral

    device.on('connect', readServices); // read services when you connect
  } else {
    console.log("Device already connected");
  }
}


function readServices() {
  // Look for services and characteristics.
  // Call the explore function when you find them:
  console.log('read services');
  var connected_uuid = this.uuid;

  var db = new sqlite3.Database('gateway.db');

  db.serialize(function() {
    var stmt = db.prepare("INSERT INTO devices VALUES (?)");

    db.get("SELECT * FROM devices WHERE uuid = ?", [connected_uuid], (err, row) => {
      if (row == undefined) {
        stmt.run(connected_uuid);
        stmt.finalize();
      } else {
        stmt.finalize();
      }
    });

  });

  db.close();

  this.discoverAllServicesAndCharacteristics(explore);
}


// the service/characteristic explore function:
function explore(error, services, characteristics) {
  // list the services and characteristics found:
  console.log('explore');
  for (c in characteristics) {
    if (characteristics[c].properties[0] == 'write') {
      write_characteristics[characteristics[c]._peripheralId] = characteristics[c];
    }
    if (characteristics[c].properties[0] == 'notify') {
      notify_characteristics[characteristics[c]._peripheralId] = characteristics[c];
    }
    peripherals[characteristics[c]._peripheralId].state = 'connected';
  }
}


function subscribeCharacteristic(characteristics) {
  console.log('subscribe');
  for (c in characteristics) {
    var uuid = characteristics[c]._peripheralId;
    if (uuid in peripherals && peripherals[uuid].state == 'connected') {
      characteristics[c].subscribe(); // subscribe to the characteristic
      characteristics[c].on('data', readData); // set a listener for it
    }
  }
}


function disconnectDevice(uuid) {
  if (peripherals[uuid].state == 'connected' && scanning != true) {
    device = peripherals[uuid];
    console.log("Disconnect: " + device.uuid);

    device.once('disconnect', function() {
      console.log("disconnecting");
    });
    device.removeListener('connect', readServices);
    device.disconnect();
    peripherals[uuid].state = 'disconnected';
  }
  else {
    console.log("Device already disconnected");
  }
}


function getDevices() {
  var result = {};
  for (i in peripherals) {
    localName = peripherals[i].advertisement.localName;
    deviceStatus = peripherals[i].state;

    if (localName == undefined) {
      localName = "unknown";
    }

    result[i] = {
      "localName": localName,
      "address": peripherals[i].address,
      "rssi": peripherals[i].rssi,
      "status": deviceStatus
    };
  }
  return result;
}


function readData(data) {
  console.log(this._peripheralId, data.readIntLE());

  // message example
  var message = {
    "uuid": this._peripheralId,
    "payload": data.readIntLE()
  }

  // Publish to MQTT Broker
  mqtt_client.publish(topic_rx, Buffer.from(JSON.stringify(message)));
}


function receiveData() {
  mqtt_client.on('message', function(topic, message) {
    /*
    message = {
      uuid: "ble_device_uuid",
      payload: "payload_from_server"
    }
    */

    /* Send to a specific target */
    var msg = JSON.parse(message.toString('utf-8'));
    var uuid = msg['uuid'];
    var payload = msg['payload'];

    sendMessage(uuid, payload);

    // var msg = JSON.parse(message.toString('utf-8'));
    // var payload = msg['payload'];
    //
    // /* Broadcast the payload to all connected devices */
    // sendBroadcast(payload);
  });
}

// Send the payload to the connected device with uuid
function sendMessage(uuid, payload) {
  var message = "unknown";

  for (charac_uuid in write_characteristics) {
    if (charac_uuid == uuid) {
      charac = write_characteristics[charac_uuid];
      console.log("Characteristic: " + charac.uuid);
      charac.write(new Buffer.from(payload), false, function(error) {
        if (!error) {
          console.log("Sent message: " + payload);
          message = "sent";
        } else {
          console.log("Error sending message");
          message = "error";
        }
      }.bind(this));
    }
  }

  // TODO - solve the bug, always returns unknown due to async
  return message;
}


// Broadcast the payload to all connected devices
function sendBroadcast(payload) {
  var message = "unknown";

  for (c in write_characteristics) {
    charac = write_characteristics[c];
    console.log("Characteristic: " + charac.uuid);
    charac.write(new Buffer.from(payload), false, function(error) {
      if (!error) {
        console.log("Sent message: " + payload);
        message = "sent";
      } else {
        console.log("Error sending message");
        message = "error";
      }
    }.bind(this));
  }

  // TODO - solve the bug, always returns unknown due to async
  return message;
}


function autoDiscover(autoDiscoverFlag) {
  if (autoDiscoverFlag) {
    discoverDevices();
  }
}


function autoConnect(autoConnectFlag) {
  if (autoConnectFlag) {
    var db = new sqlite3.Database('gateway.db');

    var uuids = [];
    db.serialize(function() {
      db.all("SELECT * FROM devices", [], (err, rows) => {
        if (rows != undefined) {
          console.log(rows);
          for (row in rows) {
            connectDevice(rows[row]['uuid']);
          }
        }
      });
    });

    db.close();
    setTimeout(function() {
      subscribeCharacteristic(notify_characteristics);
    }, 1000);
  }
}


function discoverDevices() {
  scanning = true;
  noble.on('stateChange', scanForPeripherals);
  noble.on('discover', readPeripheral);

  if (scanning != true)
    noble.startScanning();

  setTimeout(function() {
    noble.stopScanning();
    scanning = false;
    autoConnect(auto_connect);
  }, 5000);
}


module.exports = router;
module.exports.devices = peripherals;
