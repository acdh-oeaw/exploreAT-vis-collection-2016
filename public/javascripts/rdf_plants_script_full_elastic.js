var mainExports = {};

(function() {

    // ELASTIC

    var esClient = new $.es.Client({
        hosts: elasticEndpoint
    });

    var indexName = 'rdf-plants-raw';

    // App body

    lookfForCommonNamesGivenScientificName("Taraxacum");
    //lookfForScientificNamesGivenCommonName("Maibloama");

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

            var plantURIids = [];

            for(var i=0; i<resp.hits.hits.length; i++){
                plantURIids.push(resp.hits.hits[i]._source.URI.split("/")[resp.hits.hits[i]._source.URI.split("/").length-1]);
                $('#content').append(resp.hits.hits[i]._source.scientificName+"<br>");
                //appendFlickrPicture(resp.hits.hits[i]._source.scientificName);
            }

            /// Look for common names referencing (evoking) the located scientific name IDs

            var queryObject = {
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
                                }
                            ],
                            "should": [],
                            "minimum_should_match": 1
                        }
                    }
                }
            };

            for(var i=0; i<plantURIids.length; i++){
                queryObject.body.query.bool.should.push(
                    {
                        "query_string": {
                            "default_field": "URI",
                            "query": ''+plantURIids[i]
                        }
                    }
                );
            }

            esClient.search(queryObject).then(function (resp) {

                var cNameObjectIDs = [];

                for (var i = 0; i < resp.hits.hits.length; i++) {
                    cNameObjectIDs.push(resp.hits.hits[i]._source.evokedByEntryWithURI.split("/")[resp.hits.hits[i]._source.evokedByEntryWithURI.split("/").length-1])
                }

                /// Look for the located common name objects' data (the actual common name, as
                /// at this point we only know the IDs)

                queryObject = {
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
                                    }
                                ],
                                "should": [],
                                "minimum_should_match": 1
                            }
                        }
                    }
                };

                for(var i=0; i<cNameObjectIDs.length; i++){
                    queryObject.body.query.bool.should.push(
                        {
                            "query_string": {
                                "default_field": "URI",
                                "query": ''+cNameObjectIDs[i]
                            }
                        }
                    );
                }

                esClient.search(queryObject).then(function (resp) {

                    $('#content').append("<br>---<br><br>");

                    console.log("Finished with "+resp.hits.hits.length);
                    for (var i = 0; i < resp.hits.hits.length; i++) {
                        if(resp.hits.hits[i] != undefined)
                        $('#content').append((i+1)+". "+resp.hits.hits[i]._source.commonName+" ("+resp.hits.hits[i]._source.URItype+")<br>")
                    }

                }, function (err) {
                    console.trace(err.message);
                });

            }, function (err) {
                console.trace(err.message);
            });

        }, function (err) {
            console.trace(err.message);
            return reject(err);
        });
    }


    function lookfForScientificNamesGivenCommonName(commonName){

        // Look for the URI id relative to the written common name provided by the user

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

            var cNameObjectURIids = [];

            for(var i=0; i<resp.hits.hits.length; i++){
                cNameObjectURIids.push(resp.hits.hits[i]._source.URI.split("/")[resp.hits.hits[i]._source.URI.split("/").length-1]);
                $('#content').append(resp.hits.hits[i]._source.commonName+"<br>");
            }

            /// Look for scientific names referenced (evoked) by the located common name IDs

            var queryObject = {
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
                                }
                            ],
                            "should": [],
                            "minimum_should_match": 1
                        }
                    }
                }
            };

            for(var i=0; i<cNameObjectURIids.length; i++){
                queryObject.body.query.bool.should.push(
                    {
                        "query_string": {
                            "default_field": "evokedByEntryWithURI",
                            "query": ''+cNameObjectURIids[i]
                        }
                    }
                );
            }

            esClient.search(queryObject).then(function (resp) {

                var plantURIids = [];

                for (var i = 0; i < resp.hits.hits.length; i++) {
                    plantURIids.push(resp.hits.hits[i]._source.URI.split("/")[resp.hits.hits[i]._source.URI.split("/").length-1])
                }

                /// Look for the located scientific name objects' data (the actual scitific name, as
                /// at this point we only know the IDs)

                queryObject = {
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
                                    }
                                ],
                                "should": [],
                                "minimum_should_match": 1
                            }
                        }
                    }
                };

                for(var i=0; i<plantURIids.length; i++){
                    queryObject.body.query.bool.should.push(
                        {
                            "query_string": {
                                "default_field": "URI",
                                "query": ''+plantURIids[i]
                            }
                        }
                    );
                }

                esClient.search(queryObject).then(function (resp) {

                    $('#content').append("<br>---<br><br>");

                    console.log("Finished with "+resp.hits.hits.length);
                    for (var i = 0; i < resp.hits.hits.length; i++) {
                        if(resp.hits.hits[i] != undefined)
                        $('#content').append((i+1)+". "+resp.hits.hits[i]._source.scientificName+"<br>")
                    }

                }, function (err) {
                    console.trace(err.message);
                });

            }, function (err) {
                console.trace(err.message);
            });

        }, function (err) {
            console.trace(err.message);
            return reject(err);
        });
    }

    ///////

    function appendFlickrPicture(term){

        $.ajax({
            type: "GET",
            url: "api/flickr/"+term,
            dataType: "json",
            async: true,
            success: function (response) {

                var photo = response.photos.photo[0];
                var imgURL = "";
                if(photo == undefined){
                    imgURL = "img/home/blank_black.png";
                }
                else{
                    imgURL = 'https://farm'+photo.farm+'.staticflickr.com/'+photo.server+'/'+photo.id+'_'+photo.secret+'.jpg'
                }

                $("#content").prepend('<img src="'+imgURL+'" width="80px" height="auto"/><br>');

                //root.children[i].photoURL = imgURL;

                // Append SVG def corresponding to the root's child picture

                // var rootChildrens = $('.children');
                // d3.select(rootChildrens[i])
                // .append("defs")
                // .append('pattern')
                // .attr('id', function(){return "img"+root.children[i].type.split(" ")[1]+i;})
                // .attr('patternUnits', 'userSpaceOnUse')
                // .attr('width', "100%")
                // .attr('height', "100%")
                // .append("image")
                // .attr("xlink:href", function(d){return imgURL;})
                // .attr('width', "100%")
                // .attr('height', "100%")
                // .attr('x', 0)
                // .attr('y', 0)
                // .attr('preserveAspectRatio','xMinYMin slice');

                //console.log("image fetched")
            }
        });
    }

})();

console.log("Plants aint a thing!")
