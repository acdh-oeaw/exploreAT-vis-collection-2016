var express = require('express');
var router = express.Router();

var config = require('config');
var mariaDBConfig = config.get('mariaDB.dbConfig');

var dbClient = new require('mariasql')({
    host: mariaDBConfig.host,
    user: mariaDBConfig.user,
    password: mariaDBConfig.password,
    db: mariaDBConfig.db
});

router.get('/region/:region_id', function(req, res, next) {
    dbClient.query('SELECT AsText(the_geom) AS geometry FROM GISregion WHERE id=:region_id',  {region_id: req.params.region_id} , { metadata: true }, function(err, rows) {
        if (err)
            throw err;
        // `rows.info.metadata` contains the metadata
        res.json({rows: rows});
    });
});

router.get('/persons', function(req, res, next) {
    dbClient.query('SELECT person.vorname,person.nachname,GISort.the_geom  FROM `person`,`ort`,`GISort` WHERE person.todJahr>0 AND person.todOrt_id>0 AND person.gebJahr>0 AND person.gebOrt_id>0 AND ort.id=person.todOrt_id AND ort.gis_ort_id=GISort.id',  null , { metadata: true }, function(err, rows) {
        if (err)
            throw err;
        // `rows.info.metadata` contains the metadata
        res.json({rows: rows});
    });
});

module.exports = router;
