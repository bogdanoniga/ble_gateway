var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();
var api = require('./api');


router.get('/', function(req, res, next) {
  var db = new sqlite3.Database('gateway.db');

  var gateway_id = '';
  var mqtt_address = '';
  var mqtt_connection = '';
  var devices_connected = 0;

  var devices = api.devices;

  db.serialize(function() {
    db.get("SELECT * FROM configs", [], (err, row) => {
        gateway_id = row['gateway_id'];
        mqtt_address = row['mqtt_address'];
        mqtt_connection = row['status'];
    });
  });
  db.close();

  for (device in devices) {
    if (devices[device]['status'] == 'connected') {
      devices_connected += 1;
    }
  }

  setTimeout(function() {
    res.render('index', {gateway_id: gateway_id, mqtt_address: mqtt_address, mqtt_connection: mqtt_connection, devices_connected: devices_connected});
  }, 100);
});


module.exports = router;
