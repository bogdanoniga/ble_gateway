// MQTT connect
var mqtt = require('mqtt');
var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('gateway.db');

var gateway_id = '';
var mqtt_address = '';
var mqtt_connection = '';
var auto_discover = '';
var auto_connect = '';
var end_to_end_encryption = '';

setTimeout(function() {
  db.serialize(function() {
    db.get("SELECT * FROM configs", [], (err, row) => {
        gateway_id = row['gateway_id'];
        mqtt_address = row['mqtt_address'];
        mqtt_connection = row['status'];
        topic_tx = row['topic_tx'];
        topic_rx = row['topic_rx'];
        auto_discover = row['auto_discover'];
        auto_connect = row['auto_connect'];
        end_to_end_encryption = row['end_to_end_encryption'];
    });
  });
}, 2000);

setTimeout(function() {
  var mqtt_client = mqtt.connect(mqtt_address);

  mqtt_client.subscribe(topic_tx);

  mqtt_client.on('connect', function(){
      console.log('MQTT Broker connected');
      db.serialize(function() {
        var upt = db.prepare("UPDATE configs SET status = ? WHERE gateway_id = ?");
        upt.run('connected', gateway_id);
        upt.finalize();
      });
      db.close();
  });

  setTimeout(function() {
    module.exports.mqtt_client = mqtt_client;
    module.exports.topic_rx = topic_rx;
    module.exports.auto_discover = auto_discover;
    module.exports.auto_connect = auto_connect;
    module.exports.end_to_end_encryption = end_to_end_encryption;
  }, 1000);

}, 4000);
