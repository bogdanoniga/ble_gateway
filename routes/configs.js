var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();

router.get('/', function(req, res, next) {
  var db = new sqlite3.Database('gateway.db');

  var gateway_id = '';
  var mqtt_address = '';
  var mqtt_connection = '';
  var topic_tx = '';
  var topic_rx = '';

  db.serialize(function() {
    db.get("SELECT * FROM configs", [], (err, row) => {
        gateway_id = row['gateway_id'];
        mqtt_address = row['mqtt_address'];
        mqtt_connection = row['status'];
        topic_tx = row['topic_tx'];
        topic_rx = row['topic_rx'];
    });
  });
  db.close();

  setTimeout(function() {
    res.render('configs', {gateway_id: gateway_id, mqtt_address: mqtt_address, mqtt_connection: mqtt_connection, topic_tx: topic_tx, topic_rx: topic_rx});
  }, 100);
});

router.post('/save', function(req, res, next) {
  // TODO - restart app when saving new broker address
  var db = new sqlite3.Database('gateway.db');
  var mqtt_address = req.body.mqtt_address;
  var topic_tx = req.body.mqtt_subscribe_topic;
  var topic_rx = req.body.mqtt_publish_topic;

  if (mqtt_address == '' || topic_tx == '' || topic_rx == '') {
      res.json({message:'Empty fields not allowed!'});
  }
  else {
    db.serialize(function() {
      var stmt = db.prepare("UPDATE configs SET mqtt_address = ?, topic_tx = ?, topic_rx = ? WHERE gateway_id = ?");

      db.get("SELECT * FROM configs", [], (err, row) => {
          if(row != undefined) {
            stmt.run(mqtt_address, topic_tx, topic_rx, row['gateway_id']);
            console.log('MQTT information updated!');
            stmt.finalize();
          }
          else {
            stmt.finalize();
          }
      });
    });
    db.close();

    res.redirect('back');
  }

});

module.exports = router;
