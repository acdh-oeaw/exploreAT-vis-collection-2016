var mysql      = require('mysql');
//var dbClient = mysql.createConnection({
//    host: 'localhost',
//    user: 'root',
//    password: '***REMOVED***',
//    database: 'dboe_1'
//});

var _ = require('underscore');

var pool  = mysql.createPool({
    connectionLimit : 10,
    host            : 'localhost',
    user            : 'root',
    password        : '***REMOVED***',
    database        : 'dboe_1'
});

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});


var fragebogenArr = [];
pool.getConnection(function(err, connection) {
    connection.query('SELECT fragebogen.nummer as fragebogen_nummer, fragebogen.titel fragebogen_titel, fragebogen.id, frage.id AS frage_id, frage.originalfrage FROM fragebogen inner join frage ' +
        'on frage.fragebogen_id = fragebogen.id', function(err, rows, fields) {
        connection.release();
        //console.log(JSON.stringify(rows,null, '\t'));
        var fragebogenIDs = _.chain(rows).pluck("id").uniq().value();
        _.forEach(fragebogenIDs, function(fragebogenId, idx) {
            var fragebogenNummer = 0,
                fragebogenTitel = "";
            var frageArr =_.chain(rows).where({id: fragebogenId}).map(function(obj, idx) {
                if(idx == 0) {
                    fragebogenNummer = obj.fragebogen_nummer;
                    fragebogenTitel = obj.fragebogen_titel;
                }
                return {'frage_id': obj.frage_id, 'originalFrage': obj.originalfrage};
            }).value();

            var fragebogenObj = {
                'fragebogen_nummer': fragebogenNummer,
                'fragebogen_titel' : fragebogenTitel,
                'frages': frageArr
            };

            processFragebogenObj(fragebogenObj);
            //fragebogenArr.push(fragebogenObj);
        });
        //console.log(JSON.stringify(fragebogenArr, null, '\t'));


        //finishAndCleanup();
        //rows.forEach(function(row, idx) {
        //   pool.getConnection(function(err, connection) {
        //
        //   });
        //});
    });
});


function processFragebogenObj(fragebogenObj) {
    var fragesNo = fragebogenObj.frages.length;
    _.forEach(fragebogenObj.frages, function(frage, idx) {
       pool.getConnection(function(err, connection) {
           connection.query('SELECT belegzettel_beleg.beleg, belegzettel_beleg.hauptlemma_id, lemma.dbo FROM ' +
           'belegzettel_beleg inner join lemma on belegzettel_beleg.hauptlemma_id = lemma.id WHERE belegzettel_beleg.frage_id =?', frage.frage_id,
           function(err, rows, fields) {
               connection.release();
               var lemmasArr = [];
               var lemmaIds = _.chain(rows).pluck("hauptlemma_id").uniq().value();
               _.forEach(lemmaIds, function(lemmaId, idx) {
                   var lemma_dbo = "";
                   var belegArr =_.chain(rows).where({'hauptlemma_id': lemmaId}).map(function(obj, idx) {
                       if(idx == 0) {
                           lemma_dbo = obj.dbo;
                       }
                       return {'beleg': obj.beleg};
                   }).value();

                   var lemmaObj = {
                       'dbo': lemma_dbo,
                       'belegs': belegArr
                   };
                   lemmasArr.push(lemmaObj);
               });
               fragebogenObj.frages[idx].lemmas = lemmasArr;
               fragesNo--;
               if (fragesNo == 0) {
                   client.index({
                       index: 'dboe-beleg-frage-fragebogen-lemma',
                       type: 'beleg-frage-fragebogen-lemma',
                       body: fragebogenObj
                   }, function(err, response) {
                       if (err) {
                           console.error(err.stack);
                       } else {
                           console.log('Successfully indexed object with number ' + fragebogenObj.fragebogen_nummer);
                       }
                   });
               }
           });
       });
    });
}

function finishAndCleanup() {
    pool.end(function (err) {
        if (!err) {
            console.log('Pool closed');
        } else {
            console.err(err.stack);
        }
        //dbClient.close();
        process.exit();
    });
}



//dbClient.query("SELECT fragebogen.id as _id, lemma.dbo as \"fragebogen.frage.dbo\", " +
//    "belegzettel_beleg.beleg as \"fragebogen.frage.beleg\", frage.originalfrage as \"fragebogen.frage.originalfrage\", " +
//    "fragebogen.nummer as \"fragebogen.fragebogen_nummer\", " +
//    "fragebogen.titel as \"fragebogen.fragebogen_titel\"  " +
//    "FROM belegzettel_beleg inner join lemma on belegzettel_beleg.hauptlemma_id = lemma.id " +
//    "inner join frage on belegzettel_beleg.frage_id = frage.id " +
//    "inner join fragebogen on frage.fragebogen_id = fragebogen.id", function(err, rows, fields) {
//    if (err) {
//        console.error(err.stack);
//    } else {
//        console.log(rows.length);
//    }
//});





