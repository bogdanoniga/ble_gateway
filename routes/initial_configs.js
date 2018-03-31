var sqlite3 = require('sqlite3').verbose();
var os = require('os')

// ADD initial configs
var db = new sqlite3.Database('gateway.db');

var gateway_id = '0000000000000000';
var mqtt_address = 'mqtt://localhost';
var mqtt_status = '!connected';
var auto_discover = true;
var auto_connect = true;

var interfaces = os.networkInterfaces();
/* TODO: check for the new interfaces default names of the Linux environments*/
if ('en0' in interfaces) {
  gateway_id = interfaces.en0[0].mac.split(':').slice(0,3).join("") + "fffe" + interfaces.en0[0].mac.split(':').slice(3,6).join("");
}
else if ('eth0' in interfaces) {
  gateway_id = interfaces.eth0[0].mac.split(':').slice(0,3).join("") + "fffe" + interfaces.eth0[0].mac.split(':').slice(3,6).join("");
}
else if ('wlan0' in interfaces) {
  gateway_id = interfaces.wlan0[0].mac.split(':').slice(0,3).join("") + "fffe" + interfaces.wlan0[0].mac.split(':').slice(3,6).join("");
}
else if ('eth0' in interfaces) {
  gateway_id = interfaces.eth0[0].mac.split(':').slice(0,3).join("") + "fffe" + interfaces.eth0[0].mac.split(':').slice(3,6).join("");
}
else if ('wlan0' in interfaces) {
  gateway_id = interfaces.wlan0[0].mac.split(':').slice(0,3).join("") + "fffe" + interfaces.wlan0[0].mac.split(':').slice(3,6).join("");
}

var topic_tx = 'gateway/' + gateway_id + '/tx';
var topic_rx = 'gateway/' + gateway_id + '/rx';

db.serialize(function() {
  db.run("CREATE TABLE if not exists configs (gateway_id TEXT, mqtt_address TEXT, status TEXT, topic_tx TEXT, topic_rx TEXT, auto_discover BOOLEAN NOT NULL, auto_connect BOOLEAN NOT NULL)");
  db.run("CREATE TABLE if not exists devices (uuid TEXT)");

  var stmt = db.prepare("INSERT INTO configs VALUES (?, ?, ?, ?, ?, ?, ?)");
  var upt = db.prepare("UPDATE configs SET status = ? WHERE gateway_id = ?");

  db.get("SELECT * FROM configs", [], (err, row) => {
      if(row == undefined) {
        stmt.run(gateway_id, mqtt_address, mqtt_status, topic_tx, topic_rx, auto_discover, auto_connect);
        stmt.finalize();
        upt.finalize();
      }
      else {
        upt.run(mqtt_status, gateway_id);
        upt.finalize();
        stmt.finalize();
      }
  });

});

db.close();

console.log("Initial configs added!");
// END ADD initial configs
