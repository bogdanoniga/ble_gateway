var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();

/* GET home page. */
router.get('/', function(req, res, next) {
  var db = new sqlite3.Database('gateway.db');

  var auto_discover = true;
  var auto_connect = true;

  db.serialize(function() {
    db.get("SELECT * FROM configs", [], (err, row) => {
        auto_discover = row['auto_discover'];
        auto_connect = row['auto_connect'];
    });
  });
  db.close();

  setTimeout(function() {
    res.render('devices', {auto_discover: auto_discover, auto_connect: auto_connect});
  }, 100);

});

module.exports = router;
