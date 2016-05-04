#!/usr/bin/env node

var glob = require('glob');
var fs = require("fs");

var path = require('path');
var util = require('util');
var _ = require('underscore');
var config = require('config');
var mysqlConfig = config.get('mysql');
var storage = require('node-persist');
var Promise = require("bluebird");
Promise.promisifyAll(fs);
var xml2js = Promise.promisifyAll(require('xml2js')); // example: xml2js

storage.initSync();


var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'localhost:9200'
});

if (process.argv[2] == 'undefined' || process.argv[2].length == 0) {
    console.warn('You must provide a root directory of XML files')
}

var mysql = require('promise-mysql');

var pool = mysql.createPool({
    host: mysqlConfig.host,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.db,
    connectionLimit: 10
});

var localizedPlaces = storage.getItemSync('geolocalized');

var dir = process.argv[2];
console.log('Recursively analyzing ' + dir);

var contents = fs.readdirSync(dir);

var subdirs = [];

contents.forEach(function(content) {
    if(fs.statSync(path.join(dir, content)).isDirectory())
        subdirs.push(content);
});

console.log('Found ' + JSON.stringify(subdirs));

// var promises = [];

// for (var i = 0; i < subdirs.length; i++) {
//     processDirectory(subdirs[i]).then(function(result))
// }

Promise.each(subdirs, processDirectory)
    .then(function(result) {
        console.log('All directories processed');
        process.exit(0);
    })
    .catch(function(err) {
        console.error(err);
        process.exit(1);
    });


function processDirectory(directory) {
    // var promises = [];
    var letterPath = path.join(dir, directory);
    var files = glob.sync(letterPath + '/*2-3.xml');
    console.log(files.length + ' XML files found in directory ' + letterPath);
    // for (var j = 0; j < files.length; j ++) {
    //     promises.push(processFile(files[j]));
    // }

    return Promise.resolve(files).each(processFile);

    // return Promise.mapSeries(promises, function (fileResult) {
    //     console.log('Correctly processed file');
    // }).catch(function (err) {
    //     console.log('Failed to process file. Reason: '  + err);
    // });
}
var currentLemmas = [];

function processFile(file) {
    console.log(file);
    return fs.readFileAsync(file)
        .then(function(contents) {
            var parser = new xml2js.Parser();
            return parser.parseStringAsync(contents);
        })
        .then(function (result) {
            if (result.hasOwnProperty("records")) {
                if (result.records.hasOwnProperty("record")) {
                    return Promise.each(result.records.record, processRecord).then(function(fileResults) {
                        console.log('Finished processing file, indexing...');
                        return indexResults(currentLemmas);
                    });
                }
            } else {
                return Promise.resolve();
            }
        })
        .then(function () {
            currentLemmas = [];
        });
}


function processRecord(record) {
    // console.log(record);
    if (record.hasOwnProperty("field")) {
        var lemma;
        var theField = _.find(record["field"], function(aField) {
            return aField["$"].name == "HL";
        });
        if (theField)
            lemma = processHLField(theField);

        if (lemma == undefined || lemma.mainLemma == undefined) {
            return;
        }

        theField = _.find(record["field"], function(aField) {
            return aField["$"].name == "QDB";
        });
        if (theField && lemma && lemma !== 'undefined' && lemma.length > 1)
            lemma = processQDBField(theField, lemma);
        if (lemma.ortName == undefined) {
            theField = _.find(record["field"], function(aField) {
                return aField["$"].name == "O";
            });
            if (theField) {
                lemma.ortName = theField["_"];
            }
        }

        if (lemma.ortName !== undefined) {
            var placeMatch = localizedPlaces.filter(function (aPlace) {
                return aPlace.name == lemma.ortName
            })[0];
            if (placeMatch !== undefined) {
                var query,
                    params;
                if (placeMatch.ort_id > -1) {
                    query = "SELECT ST_AsGeoJSON(GISort.the_geom) AS gisort, " +
                        "ST_AsGeoJSON(GISgemeinde.the_geom) AS gisgemeinde " +
                        "FROM GISort LEFT JOIN ort ON GISort.id = ort.gis_ort_id, " +
                        "GISgemeinde LEFT JOIN gemeinde ON GISgemeinde.id = gemeinde.gis_gemeinde_id " +
                        "WHERE ort.id = ?";
                    if (placeMatch.gemeinde_id > -1) {
                        query += ' AND gemeinde.id = ?';
                        params = [placeMatch.ort_id, placeMatch.gemeinde_id];
                    } else
                        params = [placeMatch.ort_id];

                } else if (placeMatch.gemeinde_id > -1) {
                    query = "SELECT ST_AsGeoJSON(GISgemeinde.the_geom) AS gisgemeinde " +
                        "FROM GISgemeinde LEFT JOIN gemeinde ON GISgemeinde.id = gemeinde.gis_gemeinde_id " +
                        "WHERE gemeinde.id = ?";
                    params = [placeMatch.gemeinde_id];
                } else {
                    currentLemmas.push(lemma);
                    return;
                }

                return pool.query(query, params)
                    .then(function (rows) {
                        if (rows.length !== 0) {
                            var result = rows[0];
                            if (result.gisgemeinde !== undefined) {
                                lemma.gisGemeinde = result.gisgemeinde;
                            }
                            if (result.gisort !== undefined) {
                                lemma.gisOrt = result.gisort;
                            }
                        }
                        currentLemmas.push(lemma);
                        // return Promise.resolve(lemma);
                    })
                    .catch(function (err) {
                        return Promise.reject(err);
                    });

            } else {
                currentLemmas.push(lemma);
                // return lemma;
            }
        } else {
            currentLemmas.push(lemma);
            // return lemma;
        }
    } else {
        console.log('Record has no fields');
        return Promise.resolve();
    }
}



function processHLField(theField) {

    var rawLemma = theField["_"];
    var finalLemma = {};

    var test = rawLemma.match(/:\d/g);
    if (test !== undefined) {
        var typeName = wordTypeNameForType(test[0].charAt(1));
        rawLemma = rawLemma.replace(/:\d/g, "");
        finalLemma.wordType = typeName;
    }


    if (rawLemma) {
        rawLemma = rawLemma.replace(" ", "");
        rawLemma = rawLemma.toLowerCase();
        // console.log('Lemma found: ' + lemma);
    }

    var leftLemma = rawLemma.match(/\((.*?)\)/);

    if (leftLemma == 'undefined' || leftLemma == null || leftLemma.length == 0) {
        if (rawLemma.length == 0 || rawLemma.length == 1 || rawLemma == 'undefined') {
            console.log('Bad lemma format');
        } else {
            finalLemma['mainLemma'] = rawLemma;
            finalLemma['isMain'] = true;
        }
    } else {
        leftLemma = leftLemma[1];
        rawLemma = rawLemma.split(')')[1];
        if (rawLemma.length == 0 || rawLemma.length == 1 || rawLemma == 'undefined') {
            console.log('Bad lemma format');
        } else {
            finalLemma['mainLemma'] = rawLemma;
            finalLemma['leftLemma'] = leftLemma;
        }
    }

    return finalLemma;
}

function processQDBField(theField, lemma) {

    if (theField.hasOwnProperty("field")) {
        var ortField = theField.field[0];
        var ortName;
        if (ortField["$"].name == "O") {
            ortName = ortField["_"];
            lemma.ortName = ortName;
        }
    }

    var match = theField["_"].match(/\d{4}/);
    if (match !== undefined && match.length > 0)
        lemma.year = match[0];

    return lemma;
}






// var placesArray = [];
//
// _.each(places, function(value, key) {
//     placesArray.push({"name": key, "count": value});
// });
//
// placesArray = _.sortBy(placesArray, "count");
//
// fs.writeFile('places.json', JSON.stringify(placesArray, null, 2), function(err) {
//         if (err) throw err;
//         console.log('It\'s saved!');
//         process.exit(0);
// });
// fs.writeFile('results.json', JSON.stringify(lemmas),  function(err) {
//     if (err) throw err;
//     console.log('It\'s saved!');
//     process.exit(0);
// });


function indexResults(results) {
    console.log('Results length is ' + results.length);
    var bulk_request = [];
    results.forEach(function(result) {
        bulk_request.push({index: {_index: 'tustepgeo', _type: 'tustepgeo-type'}});
        bulk_request.push(result);
    });
    //index and flush
    return client.bulk({
            body: bulk_request
        });
}

function wordTypeNameForType(type) {
    var typeName = "";
    switch (type) {
        case "0":
            typeName = "prefix";
            break;
        case "1":
            typeName = "noun";
            break;
        case "2":
            typeName = "adjective";
            break;
        case "3":
            typeName = "adverb";
            break;
        case "4":
            typeName = "numeral";
            break;
        case "5":
            typeName = "pronoun";
            break;
        case "6":
            typeName = "verb";
            break;
        case "7":
            typeName = "preposition";
            break;
        case "8":
            typeName = "conjunction";
            break;
        case "9":
            typeName = "interjection";
            break;
    }
    return typeName;
}




// lemmas.forEach(function (lemma) {
//     client.index({
//         index: 'tustep',
//         type: 'tweet',
//         body: {"name" : lemma,
//             "files" : lemmas[lemma]}
//     }, function (err, resp) {
//         // console.log(resp);
//         if (err) throw err;
//     });
// });






