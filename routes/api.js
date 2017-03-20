var express = require('express');
var router = express.Router();

var config = require('config');

var flickrConfig = config.get('flickr');
var flickrClient;
var Flickr = require("flickrapi"),
flickrOptions = {
    api_key: flickrConfig.apiKey,
    secret: flickrConfig.apiSecret,
    user_id: flickrConfig.userId,
    access_token: flickrConfig.accessToken,
    access_token_secret: flickrConfig.accessTokenSecret
};

Flickr.authenticate(flickrOptions, function(error, flickr) {
    flickrClient = flickr;
});

var mysqlConfig = config.get('mysql');

var MySQL      = require('mysql');
var dbClient = MySQL.createConnection({
    host: mysqlConfig.host,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.db
});

var europeana = require('europeana')('***REMOVED***');

//

dbClient.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + dbClient.threadId);
});

router.get('/flickr/:queryText', function(req, res, next) {

    flickrClient.photos.search({
        text: req.params.queryText,
        page: 1,
        per_page: 1
    }, function(err, result) {
        if(err){
            res.send(err);
        }
        res.send(result);
    });

});

router.post('/europeana', function(req, res, next) {

    function euroCallback (err, data) {
        if (err) {
            res.send(err);
        }
        else {
            res.send(data)
        }
    }

    europeana ('search', req.body, euroCallback);

    // Record
    //var recordId = '/08501/03F4577D418DC84979C4E2EE36F99FECED4C7B11';
    //europeana ('record' + recordId, console.log);
});

router.post('/eurorecord', function(req, res, next){

    function euroCallback (err, data) {
        if (err) {
            res.send(err);
        }
        else {
            res.send(data)
        }
    }

    var recordId = req.body.recordId;
    europeana ('record' + recordId, euroCallback);
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
            sql: 'SELECT lemma.id as id, ' +
            'lemma.dbo as word, '+
            'lemma_wortart.bezeichnung as partOfSpeech, '+
            'belegzettel.quelle as quelleSource, '+
            'belegzettel.quelle_id as quelleId, '+
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
                sql: 'SELECT belegzettel_beleg.id as id, '+
                'belegzettel_beleg.beleg as word, '+
                'lemma_wortart.bezeichnung as partOfSpeech, '+
                'belegzettel.quelle as quelleSource, '+
                'belegzettel.quelle_id as quelleId, '+
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

        router.get('/lemmas', function(req, res, next) {
            dbClient.query('SELECT lemma.id as id, '+
            'lemma.dbo as dbo, '+
            'belegzettel.lade as lade, '+
            'lemma.lemma_wortart_id as partOfSpeech '+
            'FROM lemma, belegzettel, belegzettel_beleg  '+
            'WHERE lemma.dbo LIKE \'%%\'  '+
            'AND lemma.dbo NOT LIKE \'%jost nickel%\'  '+
            'AND belegzettel.id = belegzettel_beleg.belegzettel_id '+
            'AND belegzettel_beleg.belegzettel_id IS NOT NULL '+
            'AND belegzettel_beleg.hauptlemma_id IS NOT NULL '+
            'AND belegzettel_beleg.hauptlemma_id = lemma.id '+
            'LIMIT 500',
            function(err, rows) {
                if (err)
                throw err;
                // `rows.info.metadata` contains the metadata
                res.json({rows: rows});
            });
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


        router.get('/elasticEndpoint', function (req, res, next) {
            res.send(elasticEndpoint);
        });

        module.exports = router;
