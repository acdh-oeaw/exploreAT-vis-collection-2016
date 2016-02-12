var express = require('express');
var router = express.Router();

var config = require('config');
var mysqlConfig = config.get('mariaDB.dbConfig');

var MySQL      = require('mysql');
var dbClient = MySQL.createConnection({
    host: mysqlConfig.host,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.db
});

dbClient.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + dbClient.threadId);
});


router.get('/region/:region_id', function(req, res, next) {
    dbClient.query('SELECT AsText(the_geom) AS geometry FROM GISregion WHERE id=?',req.params.region_id,
        function(err, rows) {
            if (err)
                throw err;
            // `rows.info.metadata` contains the metadata
            res.json({rows: rows});
        });
});

router.get('/persons', function(req, res, next) {
    dbClient.query('SELECT person.vorname,person.nachname,GISort.the_geom  FROM `person`,`ort`,`GISort` ' +
        'WHERE person.todJahr>0 AND person.todOrt_id>0 AND person.gebJahr>0 AND person.gebOrt_id>0 ' +
        'AND ort.id=person.todOrt_id AND ort.gis_ort_id=GISort.id',
        function(err, rows) {
            if (err)
                throw err;
            // `rows.info.metadata` contains the metadata
            res.json({rows: rows});
        });
});

module.exports = router;
