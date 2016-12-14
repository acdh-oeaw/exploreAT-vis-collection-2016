#!/usr/bin/env node

const indexName = 'dboe-tei';
const indexType = 'dboe-tei-type';

var glob = require('glob');
var fs = require("fs");

var path = require('path');
var util = require('util');
var _ = require('underscore');
var config = require('config');
var storage = require('node-persist');
var Promise = require("bluebird");
Promise.promisifyAll(fs);
var xml2js = Promise.promisifyAll(require('xml2js')); // example: xml2js
var parser = require('xml2json');

storage.initSync();

var gisOrtDict = {};
var gisGemDict = {};


var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: 'localhost:9200'
});

if (process.argv[2] == 'undefined' || process.argv[2].length == 0) {
    console.warn('You must provide a root directory of XML files')
}

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
var discardedLemmas = {};

for (var i = 0; i < subdirs.length; i++) {
    promises.push(processDirectory(subdirs[i]));
}

Promise.all(promises)
    .then(function(result) {
        console.log('All directories processed');
        process.exit(0);
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


const options = {
    object: true,
    reversible: false,
    coerce: true,
    sanitize: true,
    trim: true,
    arrayNotation: false
};


function processDirectory(directory) {
    // var promises = [];
    var letterPath = path.join(dir, directory);
    var files = glob.sync(letterPath + '/*TEI-02.xml');
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
            var entries = parser.toJson(contents, options).TEI.text.body.entry;
            var processedEntries = _.map(entries, processRecord);
            return indexResults(processedEntries);
        });
}


function processRecord(entry) {
    var quelles = entry.ref.map(function (aRef) {
        if (aRef.type == 'quelleBearbeitet')
            return aRef;
    });
    quelles.forEach(function (quelle) {
        if (quelle !== undefined && quelle.hasOwnProperty('$t')) {
            var years = extractYearFromText(quelle['$t']);
            if (years) {
                entry.startYear = years[0];
                entry.endYear = years[1];
            }
        }
    });

    // if (entry.hasOwnProperty("cit")) {
    //     delete entry.cit;
    // }
    // if (entry.hasOwnProperty("etym")) {
    //     delete entry.etym;
    // }

    return entry;
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
        bulk_request.push({index: {_index: indexName, _type: indexType}});
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