#!/usr/bin/env node

var glob = require('glob');
var fs = require('fs');
var path = require('path');
var util = require('util');
var _ = require('underscore');
var config = require('config');
var mysqlConfig = config.get('mysql');
var Promise = require("bluebird");
var storage = require('node-persist');

storage.initSync();

var MySQL      = require('mysql');
var dbClient = MySQL.createConnection({
    host: mysqlConfig.host,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.db
});

var readlineSync = require('readline-sync');




var places;
if (process.argv[2] === undefined) {
    var placesPath = path.resolve(__dirname, 'places.json');
    if(fs.statSync(placesPath).isFile()) {
        places = require(placesPath);
        console.log('Found places');
    } else {
        console.error("Can't find places.json. Please provide name or check file exists");
        process.exit(1);
    }
}

places = _.sortBy(places, "count").reverse();

var totalCount = _.reduce(places, function(memo, place) {
    return memo + place.count;
}, 0);


var localizedPlaces = storage.getItemSync('geolocalized');

console.log(localizedPlaces.length + ' localized places');

if (localizedPlaces == undefined) {
    localizedPlaces = [];
}

function saveGeolocalizedPlace(place, row) {
    var processedPlaces = storage.getItemSync('geolocalized');
    if(!row.gemeinde_id) {
        var ort = getOrtFromPlace(place.name.split(' '));
        return promisifyQuery('SELECT * FROM gemeinde WHERE nameKurz LIKE ? OR nameKurz LIKE ? OR originaldaten LIKE ? OR originaldaten LIKE ?',
            ['%' + place.name + '%','%' + place.name + '%', '%' + ort + '%', '%' + ort + '%'])
            .then(function(gemRows) {
                var gemId = -10;
                if (gemRows.length == 0) {
                    gemId = readlineSync.questionInt('Enter gemeinde_id?');
                } else if (gemRows.length ==1) {
                    gemId = gemRows[0].id;
                } else {
                    var index = readlineSync.keyInSelect(_.map(gemRows, function(gemRow) {
                        return gemRow['nameKurz'] + ' \t\tid:\t' + gemRow.id;
                    }), 'Select one gemeinde');
                    if (index == -1)
                        return;
                     else {
                        gemId = gemRows[index].id;
                    }
                }
                console.log("Setting " + place.name + "to ort_id: " + row.id + " and gemeinde_id: " + gemId + "\n");
                processedPlaces.push({"name": place.name, "ort_id": row.id, "gemeinde_id": gemId});
                storage.setItemSync("geolocalized", processedPlaces);
            });
    } else {
        console.log("Setting " + place.name + "to ort_id: " + row.id + " and gemeinde_id: " + row.gemeinde_id + "\n");
        processedPlaces.push({"name": place.name, "ort_id": row.id, "gemeinde_id": row.gemeinde_id});
        storage.setItemSync("geolocalized", processedPlaces);
        return Promise.resolve();
    }
}

function insertOrtOrGemeinde(res, place) {
    var index = readlineSync.keyInSelect(res.map(function (resObj) {
        return resObj['id'] + '\t' + resObj['nameKurz'] + '\t' + resObj['gemeinde_id'];
    }).concat('Use gemeinde only'), 'Select ort');
    console.log(index);
    if (index == -1) {
        console.log(-1);
        saveGeolocalizedPlace(place, {"id": -2, "gemeinde_id": -2});
    } else if (index < res.length) {
        saveGeolocalizedPlace(place, {"id": res[index]['id'], "gemeinde_id": res[index]['gemeinde_id']});
    } else {
        saveGeolocalizedPlace(place, {"id": -2, "gemeinde_id": res[0]['gemeinde_id']});
    }
}
function insertPlaceData(place) {
    var index = readlineSync.keyInSelect(["Enter ort_id", "Enter gemeinde_id"], 'Select an option');
    console.log(index);
    if (index == -1) {
        var indexTwo = readlineSync.keyInSelect(["Enter IDs"], 'Select an option');
        if (indexTwo == -1)
            saveGeolocalizedPlace(place, {"id": -2, "gemeinde_id": -2});
        else {
            var ortId = readlineSync.questionInt('Enter ort_id?');
            var gemId = readlineSync.questionInt('Enter gemeinde_id?');
            saveGeolocalizedPlace(place, {"id": ortId, "gemeinde_id": gemId});
        }
    }

    else if (index == 0) {
        var ortId = readlineSync.questionInt('Enter ort_id?');
        var gemId = readlineSync.questionInt('Enter gemeinde_id?');
        saveGeolocalizedPlace(place, {"id": ortId, "gemeinde_id": gemId});
    } else {
        var gemId = readlineSync.questionInt('Enter gemeinde_id?');
        saveGeolocalizedPlace(place, {"id": -1, "gemeinde_id": gemId});
    }
}
function actionWhenNoMatches(place) {
    var ort = getOrtFromPlace(place.name.split(' '));

    // var index = readlineSync.keyInSelect(["Show matches in gemeinde table", "Enter id by hand"],
    //     'Could not find match for ' + JSON.stringify(place, null, 2) + '\nWhat should I do next?');
    return promisifyQuery('SELECT * FROM gemeinde WHERE nameKurz LIKE ? OR nameKurz LIKE ? OR originaldaten LIKE ? OR originaldaten LIKE ? ORDER BY nameKurz',
        ['%' + place.name + '%','%' + place.name + '%', '%' + ort + '%', '%' + ort + '%'])
        .then(function(gemRows) {
            if (gemRows.length > 0) {
                gemRows = _.sortBy(gemRows, "nameKurz");
                if (gemRows.length == 1) {
                    console.log(gemRows[0]['nameKurz'] + ' gemeinde_id \t' + gemRows[0].id);
                    //only one gemeinde found
                    return promisifyQuery('SELECT * FROM ort WHERE gemeinde_id = ?', gemRows[0]['id'])
                        .then(function(ortRows) {
                            if (ortRows.length == 1) {
                                saveGeolocalizedPlace(place, ortRows[0]);
                            } else {
                                var res = ortRows.filter(function(item) {
                                    return item['nameLang'].toLowerCase().slice(0,3) == place.name.toLowerCase().slice(0,3);
                                });
                                if (res.length == 1) {
                                    saveGeolocalizedPlace(place, res[0]);
                                } else if (res.length == 0) {
                                    if (ortRows.length == 0)
                                        saveGeolocalizedPlace(place, {"id": -2, "gemeinde_id": gemRows[0].id});
                                    else {
                                        insertOrtOrGemeinde(ortRows, place);
                                    }
                                }
                                else {
                                    insertOrtOrGemeinde(res, place);
                                }
                            }
                        });
                } else {
                    gemRows.forEach(function(row) {
                        console.log(row['nameKurz'] + ' gemeinde_id \t' + row.id);
                    });
                    insertPlaceData(place);
                }
            } else {
                console.log('No matches in gemeinde');
                insertPlaceData(place);
            }
        });
    // switch (index) {
    //     case -1:
    //         saveGeolocalizedPlace(place, {"id" : -2, "gemeinde_id" : -2});
    //         break;
    //     case 0:
    //
    //         break;
    //
    //     case 1:
    //         var ortId = readlineSync.questionInt('Enter ort_id?');
    //         var gemId = readlineSync.questionInt('Enter gemeinde_id?');
    //         saveGeolocalizedPlace(place, {"id" : ortId, "gemeinde_id" : gemId});
    //         break;
    //
    //     case 2:
    //         break;
    // }
}

function promisifyQuery(query, params) {
    var queryPromise = Promise.promisify(dbClient.query, {context: dbClient});
    return queryPromise(query, params);
}

function getOrtFromPlace(placeSplit) {
    if (placeSplit[0].charAt(0) == '(') {
        placeSplit.shift();
    }
    
    var ort;
    if (placeSplit[0].charAt(placeSplit[0].length - 1) == '.') {
        ort = placeSplit[0].slice(0,-1);
    } else {
        ort = placeSplit[0];
    }

    ort = ort.replace(/\/[A-za-z]+/i, "");
    console.log(ort);
    return ort;


}

function handleOrtResults(place, ortRows) {
    var ort = getOrtFromPlace(place.name.split(' '));
    if (ortRows.length == 1) {
        return saveGeolocalizedPlace(place, ortRows[0]);
    } else {
        if (ortRows.length > 35) {
            return promisifyQuery('SELECT * FROM gemeinde WHERE nameKurz LIKE ? OR nameKurz LIKE ? OR originaldaten LIKE ? OR originaldaten LIKE ?',
                ['%' + place.name + '%','%' + place.name + '%', '%' + ort + '%', '%' + ort + '%'])
                .then(function(gemRows) {
                    if (gemRows.length < 40) {
                        _.forEach(gemRows,function(gemRow) {
                            console.log(gemRow['id'] + '\t\t ' + gemRow['nameKurz'] + '\t\t\t ' + gemRow['nameLang']);
                        });
                    } else
                        console.log('Too many results in gemeinde');

                    var ortId = readlineSync.questionInt('Enter ort_id?');
                    var gemId = readlineSync.questionInt('Enter gemeinde_id?');
                    saveGeolocalizedPlace(place, {"id" : ortId, "gemeinde_id" : gemId});
                });

        } else {
            return promisifyQuery('SELECT * FROM gemeinde WHERE nameKurz LIKE ? OR nameKurz LIKE ? OR originaldaten LIKE ? OR originaldaten LIKE ?',
                ['%' + place.name + '%','%' + place.name + '%', '%' + ort + '%', '%' + ort + '%'])
                .then(function(gemRows) {
                    if (gemRows.length == 1) {
                        var res = _.filter(ortRows, function(ortRow) {
                            return ((ortRow['gemeinde_id'] == gemRows[0]['id']) || (ortRow['gemeinde_id'] == null));
                        });
                        if (res.length == 0) {
                            insertPlaceData(place);
                        } else if (res.length == 1) {
                            //Directly save
                            saveGeolocalizedPlace(place, res[0]);
                        } else {
                            if (gemRows.length < 40) {
                                _.forEach(gemRows,function(gemRow) {
                                    console.log(gemRow['id'] + '\t\t ' + gemRow['nameKurz'] + '\t\t\t ' + gemRow['nameLang']);
                                });
                            } else
                                console.log('Too many results in gemeinde');
                            insertOrtOrGemeinde(res, place);
                        }
                    } else {

                        if (gemRows.length < 40) {
                            _.forEach(gemRows,function(gemRow) {
                                console.log(gemRow['id'] + '\t\t ' + gemRow['nameKurz'] + '\t\t\t ' + gemRow['nameLang']);
                            });
                        } else
                            console.log('Too many results in gemeinde');

                        var gemIds = _.pluck(gemRows, 'id');
                        var options = ortRows.filter(function(ortRowObj) {
                            return gemIds.indexOf(ortRowObj['gemeinde_id']) !== -1;
                        });

                        if (options.length == 1) {
                            saveGeolocalizedPlace(place, options[0]);
                        } else {
                            if (options.length == 0)
                                options = ortRows;
                            var index = readlineSync.keyInSelect(_.map(options, function(ortRow) {
                                return ortRow['nameKurz'] + ' \t\tort_id:\t' + ortRow.id + ' \t\tgemeinde_id:\t\t' + ortRow.gemeinde_id;
                            }), 'Select one place');

                            if (index !== -1) {
                                saveGeolocalizedPlace(place, options[index]);
                            }
                            else if (index !== -2) {
                                var ortId = readlineSync.questionInt('Enter ort_id?');
                                var gemId = readlineSync.questionInt('Enter gemeinde_id?');
                                saveGeolocalizedPlace(place, {"id" : ortId, "gemeinde_id" : gemId});
                            }
                            else {
                                saveGeolocalizedPlace(place, {"id": -2, "gemeinde_id": -2});
                            }
                        }
                    }
                });
        }
    }
}

places.reduce(function(accPromise, place) {
    if (localizedPlaces.filter(function (aPlace) {
            return aPlace.name == place.name
        }).length > 0){ return accPromise.then(function(){return Promise.resolve();});}

    var placeSplit = place.name.split(' ');
    if(placeSplit.length == 3) {
        var ort = getOrtFromPlace(placeSplit);
        return accPromise.then(function() {
           return promisifyQuery('SELECT * FROM ort WHERE nameKurz LIKE ?', ort + '%');
        }).then(function (ortRows) {
            console.log(JSON.stringify(place, null, 2));
            if (ortRows.length == 0) {
                return promisifyQuery('SELECT * FROM ort WHERE nameKurz LIKE ? OR originaldaten LIKE ?', ['%' + ort + '%','%' + ort + '%'])
                .then(function(ortRowsTwo) {
                    if (ortRowsTwo.length == 0)
                        actionWhenNoMatches(place);
                    else {
                        handleOrtResults(place, ortRowsTwo);
                    }
                });
            } else {
                handleOrtResults(place, ortRows);
            }
        }).then(function(theId){
            console.log('Next record...');
        });
    } else return accPromise.then(function () {
        return Promise.resolve();
    });
}, Promise.resolve()).then(function () {
    console.log('Finished');
    process.exit(0);
});



// _.each(places, function(place, idx) {
//     var placeSplit = place.name.split(' ');
//     if(placeSplit.length == 2) {
//         var ort = placeSplit[0].replace('.', '');
//         dbClient.query('SELECT * FROM ort WHERE nameKurz LIKE ?','%' + ort + '%',
//             function(err, rows) {
//                 if (err)
//                     throw err;
//
//                 console.log(JSON.stringify(rows, null, 2));
//                 if (rows.length == 1) {
//                     term( 'Save this object? [Y|n]\n' ) ;
//                     term.yesOrNo( { yes: [ 'y' , 'ENTER' ] , no: [ 'n' ] } , function( error , result ) {
//                         if (result) {
//                             term.green( "Setting " + place.name + "to ort_id: " + rows[0].id + " and gemeinde_id: " + rows[0].gemeinde_id + "\n" );
//                             processedPlaces.push([{"name" : place.name, "ort_id": rows[0].id, "gemeinde_id" : rows[0].gemeinde_id}]);
//                         }
//                     });
//                 } else {
//                     console.log('More than two rows');
//                 }
//
//                 if(idx == places.length - 1) {
//                     process.exit(0);
//                 }
//             });
//     } else if(idx == places.length - 1) {
//         process.exit(0);
//     }
// });
