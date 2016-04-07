#!/usr/bin/env node

var glob = require('glob');
var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var util = require('util');
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

var lemmas = {};

subdirs.forEach(function(subdir) {
    var letterPath = path.join(dir, subdir);
    var files = glob.sync(letterPath + '/*2-3.xml');
    console.log(files.length + ' XML files found in directory ' + letterPath);
    files.forEach(function(file) {
        var parser = new xml2js.Parser();
        // console.log(file);
        parser.parseString(fs.readFileSync(file), function (err, result) {
            // var jsonResult = JSON.stringify(result);
            if (result.hasOwnProperty("records")) {
                if (result.records.hasOwnProperty("record")) {
                    result.records.record.forEach(function(record) {
                        if (record.hasOwnProperty("field")) {
                            record["field"].forEach(function(theField) {
                                if(theField["$"].name == "HL") {
                                    var lemma = theField["_"];
                                    // console.log('Lemma found: ' + lemma);
                                    if (lemmas.hasOwnProperty(lemma)) {
                                        if (lemmas[lemma].hasOwnProperty(file)) {
                                            var num = lemmas[lemma][file];
                                            lemmas[lemma][file] = num + 1;
                                        } else {
                                            lemmas[lemma][file] = 1;
                                        }
                                        lemmas[lemma]["count"] += 1;

                                        client.update({
                                            index: 'tustep',
                                            type: 'tweet',
                                            id: lemma,
                                            body: {"files" : lemmas[lemma]}
                                        }, function (err, resp) {
                                            if (err) throw err;
                                        });

                                    } else {
                                        lemmas[lemma] = {};
                                        lemmas[lemma]["count"] = 1;
                                        lemmas[lemma][file] = 1;

                                        client.index({
                                            index: 'tustep',
                                            type: 'tweet',
                                            id: lemma,
                                            body: {"name" : lemma,
                                                "files" : lemmas[lemma]}
                                        }, function (err, resp) {
                                            console.log(resp);
                                            if (err) throw err;
                                        });
                                    }
                                }
                            });
                        } else {
                            console.log('Record has no fields');
                        }
                    });
                }
            }
        });
    });
});

fs.writeFile('results.json', JSON.stringify(lemmas, null, 2),  function(err) {
    if (err) throw err;
    console.log('It\'s saved!');
    process.exit(0);
});





