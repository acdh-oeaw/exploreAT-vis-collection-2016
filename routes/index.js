var express = require('express');
var router = express.Router();

var MariaDB = require('mariasql');

var dbClient = new MariaDB({
    host: '127.0.0.1',
    user: 'root',
    password: '***REMOVED***',
    db: 'dboe_1'
});

/* GET home page. */
router.get('/region/:region_id', function(req, res, next) {
  //res.render('index', { title: 'Express' });
  //res.json({message: 'Yeah, Im alive!'});
    dbClient.query('SELECT AsText(the_geom) AS geometry FROM GISregion WHERE id=:region_id',  {region_id: req.params.region_id} , { metadata: true }, function(err, rows) {
        if (err)
            throw err;
        // `rows.info.metadata` contains the metadata

        res.json({rows: rows});
    });
});

module.exports = router;
