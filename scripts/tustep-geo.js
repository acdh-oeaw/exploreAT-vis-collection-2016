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

var gisOrtDict = {};
var gisGemDict = {};


var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: elasticEndpoint
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

var promises = [];
var discardedLemmas = {},
    unmatchedPlaces = {},
    placesWithNoResults = {};

for (var i = 0; i < subdirs.length; i++) {
    promises.push(processDirectory(subdirs[i]));
}

Promise.all(promises)
    .then(function(result) {
        console.log('All directories processed');

        var noresultsArray = [];
        _.each(placesWithNoResults, function(value, key) {
            noresultsArray.push({"name": key, "count": value.count, "params": value.params});
        });
        noresultsArray = _.sortBy(noresultsArray, "count");


        fs.writeFile('noresults.json', JSON.stringify(noresultsArray, null, 2), function(err) {
            if (err) throw err;

            var unmatchedPlacesArray = [];
            _.each(unmatchedPlaces, function(value, key) {
                unmatchedPlacesArray.push({"name": key, "count": value});
            });
            unmatchedPlacesArray = _.sortBy(unmatchedPlacesArray, "count");

            fs.writeFile('unmatched.json', JSON.stringify(unmatchedPlacesArray, null, 2), function(err) {
                if (err) throw err;

                var discardedLemmasArray = [];
                _.each(discardedLemmas, function(value, key) {
                    discardedLemmasArray.push({"name": key, "count": value});
                });
                discardedLemmasArray = _.sortBy(discardedLemmasArray, "count");

                fs.writeFile('discarded-lemmas.json', JSON.stringify(discardedLemmasArray, null, 2), function(err) {
                    if (err) throw err;
                    console.log('It\'s saved!');
                    process.exit(0);
                });

            });
        });
    })
    .catch(function(err) {
        console.error(err.stack);
        process.exit(1);
    });

// Promise.each(subdirs, processDirectory)
//     .then(function(result) {
//         console.log('All directories processed');
//         process.exit(0);
//     })
//     .catch(function(err) {
//         console.error(err.stack);
//         process.exit(1);
//     });


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
                    return Promise.mapSeries(_.each(result.records.record, function(element) {
                        _.extend(element, {fileName: file});
                    }), processRecord).then(function(fileResults) {
                        console.log('Finished processing file, indexing...');
                        return indexResults(fileResults.filter(function(item) { return item !== undefined}));
                    });
                }
            } else {
                return Promise.resolve();
            }
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
        if (theField && lemma && lemma !== undefined)
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
            if (placeMatch && placeMatch !== undefined) {
                var query,
                    params;
                if (placeMatch.ort_id > -1) {
                    if (gisOrtDict.hasOwnProperty(placeMatch.ort_id)) {
                        lemma.gisOrt = gisOrtDict[placeMatch.ort_id];
                        if (placeMatch.gemeinde_id > - 1 &&
                            gisGemDict.hasOwnProperty(placeMatch.gemeinde_id)) {
                            lemma.gisGemeinde = gisGemDict[placeMatch.gemeinde_id];
                        }
                        return insertOtherFieldsForRecord(lemma, record);
                    } else {
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
                    }
                } else if (placeMatch.gemeinde_id > -1) {
                    if (gisGemDict.hasOwnProperty(placeMatch.gemeinde_id)) {
                        lemma.gisGemeinde = gisGemDict[placeMatch.gemeinde_id];
                        return insertOtherFieldsForRecord(lemma, record);
                    }
                    query = "SELECT ST_AsGeoJSON(GISgemeinde.the_geom) AS gisgemeinde " +
                        "FROM GISgemeinde LEFT JOIN gemeinde ON GISgemeinde.id = gemeinde.gis_gemeinde_id " +
                        "WHERE gemeinde.id = ?";
                    params = [placeMatch.gemeinde_id];
                } else {
                    return insertOtherFieldsForRecord(lemma, record);
                }
                if (query == undefined)
                    console.log('Stop');
                return pool.query(query, params)
                    .then(function (rows) {
                        if (rows.length !== 0) {
                            var result = rows[0];
                            if (result.gisort !== undefined) {
                                var ortArray = JSON.parse(result.gisort)["coordinates"];
                                var ortObj = {"lat" : ortArray[1], "lon" : ortArray[0]};
                                lemma.gisOrt = ortObj;
                                gisOrtDict[params[0]] = ortObj;
                            }
                            if (result.gisgemeinde !== undefined) {
                                result.gisgemeinde = result.gisgemeinde.replace('P', 'p');
                                var gemObj = JSON.parse(result.gisgemeinde);
                                lemma.gisGemeinde = gemObj;
                                var index = params.length > 1 ? 1 : 0;
                                gisGemDict[params[index]] = gemObj;
                            }
                        } else {
                            if (placesWithNoResults.hasOwnProperty(lemma.ortName)) {
                                placesWithNoResults[lemma.ortName]["count"] += 1;
                            } else {
                                placesWithNoResults[lemma.ortName] = {"params": params, "count" : 1};
                            }
                        }
                        return insertOtherFieldsForRecord(lemma, record);
                    })
                    .catch(function (err) {
                        return Promise.reject(err);
                    });

            } else {
                if (unmatchedPlaces.hasOwnProperty(lemma.ortName)) {
                    unmatchedPlaces[lemma.ortName] += 1;
                } else {
                    unmatchedPlaces[lemma.ortName] = 1;
                }

                return insertOtherFieldsForRecord(lemma, record);
                // return lemma;
            }
        } else {
            return insertOtherFieldsForRecord(lemma, record);
            // return lemma;
        }
    } else {
        console.log('Record has no fields');
        return Promise.resolve();
    }
}

function insertOtherFieldsForRecord(lemmaObj, record) {
    var already = ["HL", "O"];
    var recNo = record['$'].n;
    lemmaObj['tustep'] = {};
    _.chain(record.field)
        .filter(function (field) { return already.indexOf(field['$'].name) == -1})
        .forEach(function (field) {
           lemmaObj.tustep[field['$'].name] = field['_'];
        });
    lemmaObj.tustep.recordNumber = recNo;
    lemmaObj.tustep.fileName = record.fileName;
    lemmaObj.tustep.orig = record.orig[0];
    return Promise.resolve(lemmaObj);
}



function processHLField(theField) {

    var rawLemma = theField["_"];
    var finalLemma = {};
    if (!rawLemma) {
        console.log('rawLemma is undefined ' + JSON.stringify(theField));
        return;
    }

    var test = rawLemma.match(/:\d/g);
    if (test && test !== undefined) {
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
            // console.log('Bad lemma format');
            insertDiscardedLemma(rawLemma);
        } else {
            finalLemma['mainLemma'] = rawLemma;
            finalLemma['isMain'] = true;
        }
    } else {
        leftLemma = leftLemma[1];
        rawLemma = rawLemma.split(')')[1];
        if (rawLemma.length == 0 || rawLemma.length == 1 || rawLemma == 'undefined') {
            // console.log('Bad lemma format');
            // discardedLemmas.push(rawLemma);
            insertDiscardedLemma(rawLemma);
        } else {
            finalLemma['mainLemma'] = rawLemma;
            finalLemma['leftLemma'] = leftLemma;
        }
    }

    return finalLemma;
}

function insertDiscardedLemma(lemma) {
    if (discardedLemmas.hasOwnProperty(lemma)) {
        discardedLemmas[lemma] += 1;
    } else {
        discardedLemmas[lemma] = 1;
    }
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

    var years = extractYearFromText(theField["_"]);
    if (!years && theField.part !== undefined && theField.part.length > 0) {
        years = extractYearFromText(theField.part[0]);
    }

    if (!years)
        return lemma;

    lemma.startYear = years[0];
    lemma.endYear = years[1];

    return lemma;

}

function extractYearFromText(text) {
    var re = /(1\d{3})(-\d{2})*|(1\d{1}.x):(\d{2})*-(\d{2})*/g;
    var match = re.exec(text);
    var years = [];
    if (match && match.length > 0) {
        if (match[2] == undefined) {
            years.push(match[1], match[1]);
        } else if (match[3] == undefined) {
            years.push(match[1]);
            years.push(match[2].replace("-", match[1].slice(0, 2)));
        } else if (match[4] == undefined) {
            years.push(match[1].slice(0,2) + match[2]);
            years.push(match[1].slice(0,2) + match[3]);
        } else {
            console.log('Problem');
            return null;
        }
        return years;
    } else {
        return null;
    }
}


function indexResults(results) {
    console.log('Results length is ' + results.length);
    var bulk_request = [];
    results.forEach(function(result) {
        bulk_request.push({index: {_index: 'tustepgeo3', _type: 'tustepgeo-type'}});
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