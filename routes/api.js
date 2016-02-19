var express = require('express');
var router = express.Router();

var config = require('config');
var mysqlConfig = config.get('mysql');

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
    dbClient.query('SELECT person.vorname as vorname, person.nachname as nachname, '+
    'person.todJahr as todJahr, AsText(GISort.the_geom) as geometry FROM person,ort,GISort '+
    'WHERE person.todJahr>0 AND person.todOrt_id>0 AND ort.id=person.todOrt_id AND ort.gis_ort_id=GISort.id',
        function(err, rows) {
            if (err)
                throw err;
            // `rows.info.metadata` contains the metadata
            res.json({rows: rows});
        });
});

router.get('/words/:table', function(req, res, next) {

  if(req.params.table == "lemma"){

    dbClient.query( {
        sql: 'SELECT lemma.dbo as word, '+
            'lemma_wortart.bezeichnung as partOfSpeech, '+
            'belegzettel.quelle as quelleSource, '+
            'belegzettel.belegjahr as year, '+
            'ort.nameLang as locationName, '+
            'AsText(GISort.the_geom) as geometry '+
            'FROM belegzettel_beleg, belegzettel, ort, GISort, lemma_wortart , lemma '+
            'WHERE belegzettel_beleg.beleg LIKE \'%%\' '+
            'AND belegzettel.lokation_ort_id IS NOT NULL '+
            'AND ort.gis_ort_id IS NOT NULL '+
            'AND belegzettel_beleg.beleg_wortart_id IS NOT NULL '+
            'AND belegzettel.id = belegzettel_beleg.belegzettel_id '+
            'AND belegzettel.lokation_ort_id = ort.id '+
            'AND belegzettel_beleg.hauptlemma_id IS NOT NULL '+
            'AND ort.gis_ort_id = GISort.id '+
            'AND belegzettel_beleg.beleg_wortart_id = lemma_wortart.id '+
            'AND belegzettel_beleg.hauptlemma_id = lemma.id '+
            'ORDER BY belegzettel.belegjahr DESC',
            timeout: 120000}
    , null , function(err, rows) {
        if (err)
          console.error(err);
            //throw err;
        // `rows.info.metadata` contains the metadata
        res.json({rows: rows});
    });
  }
  else if(req.params.table == "beleg"){

    dbClient.query( {
        sql: 'SELECT belegzettel_beleg.beleg as word, '+
            'lemma_wortart.bezeichnung as partOfSpeech, '+
            'belegzettel.quelle as quelleSource, '+
            'quelle.erscheinungsjahr as year, '+
            'ort.nameLang as locationName, '+
            'AsText(GISort.the_geom) as geometry '+
            'FROM belegzettel_beleg, belegzettel, quelle, ort, GISort, lemma_wortart '+
            'WHERE belegzettel_beleg.beleg LIKE \'%%\' '+
            //'AND CHAR_LENGTH(quelle.erscheinungsjahr) = 4 '+
            'AND belegzettel.lokation_ort_id IS NOT NULL '+
            'AND ort.gis_ort_id IS NOT NULL '+
            'AND belegzettel_beleg.beleg_wortart_id IS NOT NULL '+
            'AND belegzettel.id = belegzettel_beleg.belegzettel_id '+
            'AND quelle.id = belegzettel.quelle_id '+
            'AND belegzettel.lokation_ort_id = ort.id '+
            'AND ort.gis_ort_id = GISort.id '+
            'AND belegzettel_beleg.beleg_wortart_id = lemma_wortart.id '+
            'ORDER BY quelle.erscheinungsjahr DESC',
            timeout: 120000 }
    , null , function(err, rows) {
        if (err)
          console.error(err);
            //throw err;
        // `rows.info.metadata` contains the metadata
        res.json({rows: rows});
    });
  }
});


router.get('/colorLemma/:name', function(req, res, next) {
    dbClient.query('SELECT person.vorname,person.nachname,GISort.the_geom '+
    'FROM `person`,`ort`,`GISort` WHERE person.todJahr>0 AND person.todOrt_id>0 '+
    'AND person.gebJahr>0 AND person.gebOrt_id>0 AND ort.id=person.todOrt_id '+
    'AND ort.gis_ort_id=GISort.id',  null , { metadata: true }, function(err, rows) {
        if (err)
            throw err;
        // `rows.info.metadata` contains the metadata
        res.json({rows: rows});
    });
});

module.exports = router;
