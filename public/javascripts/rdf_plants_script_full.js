var mainExports = {};

(function() {

    // ELASTIC

    var esClient = new $.es.Client({
        hosts: elasticEndpoint
    });

    var indexName = 'rdf-plants-raw';

    // App body

    lookfForCommonNamesGivenScientificName("Bellis perennis");
    //lookfForScientificNamesGivenCommonName("Streatzer");

    // ElasticSearch Query Processing Functions

    function lookfForCommonNamesGivenScientificName(scientificName){

        // Look for the URI id relative to the written scientific name provided by the user

        esClient.search({
            index: indexName,
            type: indexName+'-type',
            size: 10000,
            body: {
                query: {
                    "bool" : {
                        "must": [
                            {
                                "exists": {
                                    "field": "scientificName"
                                }
                            },
                            {
                                "query_string": {
                                    "default_field": "scientificName",
                                    "query": scientificName
                                }
                            }
                        ]
                    }
                }
            }
        }).then(function (resp) {

            var plantURIid = resp.hits.hits[0]._source.URI.split("/")[resp.hits.hits[0]._source.URI.split("/").length-1];

            var mainHits = null;
            var referencedHits = null;
            var evokedByURIs = [];
            var evokedByObjects = [];

            var promises = [];

            esClient.search({
                index: indexName,
                type: indexName+'-type',
                size: 10000,
                body: {
                    sort: ["scientificName","commonName"],
                    query: {
                        "bool" : {
                            "must": [
                                {
                                    "exists": {
                                        "field": "scientificName"
                                    }
                                },
                                {
                                    "query_string": {
                                        "default_field": "URI",
                                        "query": ''+plantURIid
                                    }
                                }
                            ]
                        }
                    }
                }
            }).then(function (resp) {
                mainHits = resp.hits.hits;
                for (var i = 0; i < mainHits.length; i++) {
                    $('#content').append(mainHits[i]._source.scientificName+" ("+mainHits[i]._source.URItype+")<br>")
                    //if(mainHits[i]._source.evokedByEntryWithURI != undefined){evokedByURIs.push(mainHits[i]._source.evokedByEntryWithURI.split("/")[mainHits[i]._source.evokedByEntryWithURI.split("/").length-1]);}
                }

                /// Look for stuff (whatever it is) pointing the plant with the given URI id

                esClient.search({
                    index: indexName,
                    type: indexName+'-type',
                    size: 10000,
                    body: {
                        sort: ["scientificName","commonName"],
                        query: {
                            "bool" : {
                                "must": [
                                    {
                                        "exists": {
                                            "field": "evokedByEntryWithURI"
                                        }
                                    },
                                    {
                                        "query_string": {
                                            "default_field": "URI",
                                            "query": ''+plantURIid
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }).then(function (resp) {

                    referencedHits = resp.hits.hits;
                    evokedByURIs = [];
                    for (var i = 0; i < referencedHits.length; i++) {
                        // Save the URI ids of the stuff that reference the original plant
                        evokedByURIs.push(referencedHits[i]._source.evokedByEntryWithURI.split("/")[referencedHits[i]._source.evokedByEntryWithURI.split("/").length-1]);
                    }
                    //console.log(referencedHits);
                    //console.log(evokedByURIs);

                    $('#content').append("<br>---<br><br>");

                    /// Now we need to look for the info for each of the evoking URIs (the common name is the important thing)

                    function lookForInfo(i){ // We fetch the data with promises, so we wait until we have every bit of info
                        return new Promise(function(resolve, reject) {
                            esClient.search({
                                index: indexName,
                                type: indexName+'-type',
                                size: 10000,
                                body: {
                                    sort: ["scientificName","commonName"],
                                    query: {
                                        "bool" : {
                                            "must": [
                                                {
                                                    "exists": {
                                                        // could be any field
                                                        // by having 'commonName' the record also has 'language'
                                                        "field": "commonName"
                                                    }
                                                },
                                                {
                                                    "query_string": {
                                                        "default_field": "URI",
                                                        "query": ''+evokedByURIs[i]
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            }).then(function (resp) {

                                var referencingHit = resp.hits.hits;
                                evokedByObjects.push(referencingHit[0]);
                                for (var j = 0; j < referencingHit.length; j++) {
                                    //$('#content').append(referencingHit[j]._source.commonName+" ("+referencingHit[j]._source.URItype+")<br>")
                                }
                                //console.log(referencingHit);
                                //console.log(evokedByObjects.length + " objects now reference the original plant");

                                resolve(resp);
                            }, function (err) {
                                console.trace(err.message);
                                return reject(err);
                            });
                        });
                    }

                    for(var i=0; i<evokedByURIs.length; i++){

                        // We fetch the info with promises. This way we won't work with the data bit by bit,
                        // but instead be fully convinced that we will have all of the data available when
                        // we process the data later (to be processed only when we have everything available)

                        // Promises push
                        promises.push(lookForInfo(i));
                        // Promises push - end
                    }

                    /// After all's done, which is all promises completed and all the data retrieved, we
                    // process that data and manage it in the app as we please

                    Promise.all(promises).then(function() {
                        console.log("Finished with "+evokedByObjects.length);
                        for (var i = 0; i < evokedByObjects.length; i++) {
                            if(evokedByObjects[i] != undefined)
                                $('#content').append((i+1)+". "+evokedByObjects[i]._source.commonName+" ("+evokedByObjects[i]._source.URItype+")<br>")
                        }
                    }, function(err) {
                        // error occurred
                    });

                    /// end looking for the variables' values of stuff referencing the main plant

                }, function (err) {
                    console.trace(err.message);
                });

                /// end looking for the ids referencing the main plant

            }, function (err) {
                console.trace(err.message);
            });

        }, function (err) {
            console.trace(err.message);
            return reject(err);
        });
    }


    function lookfForScientificNamesGivenCommonName(commonName){

        // Given a common name, get its ID so we can then look for the original plant
        // it is evoking given the evokedBy id

        esClient.search({
            index: indexName,
            type: indexName+'-type',
            size: 10000,
            body: {
                query: {
                    "bool" : {
                        "must": [
                            {
                                "exists": {
                                    "field": "commonName"
                                }
                            },
                            {
                                "query_string": {
                                    "default_field": "commonName",
                                    "query": commonName
                                }
                            }
                        ]
                    }
                }
            }
        }).then(function (resp) {

            var commonNameURIid = resp.hits.hits[0]._source.URI.split("/")[resp.hits.hits[0]._source.URI.split("/").length-1];

            var mainHits = null;
            var referencedHits = null;
            var originalPlantsURIs = [];
            var originalPlantsObjects = [];

            var promises = [];

            // Look for the Common Name data (not really useful but still interesting)

            esClient.search({
                index: indexName,
                type: indexName+'-type',
                size: 10000,
                body: {
                    sort: ["scientificName","commonName"],
                    query: {
                        "bool" : {
                            "must": [
                                {
                                    "exists": {
                                        "field": "commonName"
                                    }
                                },
                                {
                                    "query_string": {
                                        "default_field": "URI",
                                        "query": ''+commonNameURIid
                                    }
                                }
                            ]
                        }
                    }
                }
            }).then(function (resp) {
                mainHits = resp.hits.hits;
                for (var i = 0; i < mainHits.length; i++) {
                    $('#content').append(mainHits[i]._source.commonName+" ("+mainHits[i]._source.URItype+")<br>")
                }

                /// Look for the plant (Scientific Names it evokes) this Common Name is pointing to

                esClient.search({
                    index: indexName,
                    type: indexName+'-type',
                    size: 10000,
                    body: {
                        query: {
                            "bool" : {
                                "must": [
                                    {
                                        "exists": {
                                            "field": "evokedByEntryWithURI"
                                        }
                                    },
                                    {
                                        "query_string": {
                                            "default_field": "evokedByEntryWithURI",
                                            "query": ''+commonNameURIid
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }).then(function (resp) {

                    referencedHits = resp.hits.hits;

                    originalPlantsURIs = [];
                    for (var i = 0; i < referencedHits.length; i++) {
                        // Save the URI ids of the original plants referenced by this common name
                        originalPlantsURIs.push(referencedHits[i]._source.URI.split("/")[referencedHits[i]._source.URI.split("/").length-1]);
                    }

                    $('#content').append("<br>---<br><br>");

                    /// Now we need to look for the info for each of the original plants URIs (the scientific name is the important thing)

                    function lookForInfo(i){ // We fetch the data with promises, so we wait until we have every bit of info
                        return new Promise(function(resolve, reject) {
                            esClient.search({
                                index: indexName,
                                type: indexName+'-type',
                                size: 10000,
                                body: {
                                    query: {
                                        "bool" : {
                                            "must": [
                                                {
                                                    "exists": {
                                                        "field": "scientificName"
                                                    }
                                                },
                                                {
                                                    "query_string": {
                                                        "default_field": "URI",
                                                        "query": ''+originalPlantsURIs[i]
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            }).then(function (resp) {

                                var referencingHit = resp.hits.hits;
                                originalPlantsObjects.push(referencingHit[0]);
                                for (var j = 0; j < referencingHit.length; j++) {
                                    //$('#content').append(referencingHit[j]._source.commonName+" ("+referencingHit[j]._source.URItype+")<br>")
                                }
                                //console.log(referencingHit);
                                //console.log(evokedByObjects.length + " objects now reference the original plant");

                                resolve(resp);
                            }, function (err) {
                                console.trace(err.message);
                                return reject(err);
                            });
                        });
                    }

                    for(var i=0; i<originalPlantsURIs.length; i++){

                        // We fetch the info with promises. This way we won't work with the data bit by bit,
                        // but instead be fully convinced that we will have all of the data available when
                        // we process the data later (to be processed only when we have everything available)

                        // Promises push
                        promises.push(lookForInfo(i));
                        // Promises push - end
                    }

                    /// After all's done, which is all promises completed and all the data retrieved, we
                    // process that data and manage it in the app as we please

                    Promise.all(promises).then(function() {
                        console.log("Finished with "+originalPlantsObjects.length);
                        for (var i = 0; i < originalPlantsObjects.length; i++) {
                            $('#content').append(originalPlantsObjects[i]._source.scientificName+" ("+originalPlantsObjects[i]._source.URItype+")<br>")

                            // We can chain queries. Once we have the original plant, we can
                            // look for all of the common names it actually has in the database
                            $('#content').html("");
                            lookfForCommonNamesGivenScientificName(originalPlantsObjects[i]._source.scientificName);
                        }
                    }, function(err) {
                        // error occurred
                    });

                    /// end looking for the variables' values of the original plants

                }, function (err) {
                    console.trace(err.message);
                });

                /// end looking for the ids referencing the common name

            }, function (err) {
                console.trace(err.message);
            });

        }, function (err) {
            console.trace(err.message);
            return reject(err);
        });

    }



})();

console.log("Plants aint a thing!")
