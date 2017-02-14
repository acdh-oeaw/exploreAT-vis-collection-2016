var mainExports = {};

(function() {

    // ELASTIC

    var esClient = new $.es.Client({
        hosts: elasticEndpoint
    });

    var indexName = 'rdf-plants-raw';


    // Listeners

    $( "#select-scientific" ).change(function() {
        if(this.value != "") {
            $("#common-list-up").html("");
            lookfForCommonNamesGivenScientificName(this.value);
            appendFlickrPicture(this.value,"scientific-up");
        }
    });

    $("#button-common-name").click(function() {
        $("#common-list-down").html("");
        lookfForCommonNamesGivenCommonName($("#textField-common-name").val());
    });

    $("#textField-common-name").on('keypress', function (e) {
         if(e.which === 13){
            $("#common-list-down").html("");
            lookfForCommonNamesGivenCommonName($("#textField-common-name").val());
         }
   });

    // App body

    var cNameObjectURIids = [];

    //lookfForCommonNamesGivenScientificName("Taraxacum");
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
                //$('#content').append(resp.hits.hits[i]._source.scientificName+"<br>");
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
                        sort: ["scientificName","commonName"],
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

                    //$('#content').append("<br>---<br><br>");

                    console.log("Finished with "+resp.hits.hits.length);
                    $('#common-list-up').append("<ul class='ul-common-up'>");
                    for (var i = 0; i < resp.hits.hits.length; i++) {
                        if(resp.hits.hits[i] != undefined)
                        var uriType = "";
                        if(resp.hits.hits[i]._source.URItype == "book_name_form"){uriType = "Book Name";}
                        if(resp.hits.hits[i]._source.URItype == "phonetic_name_form"){uriType = "Phonetic Name";}
                        if(resp.hits.hits[i]._source.URItype == "written_name_form"){uriType = "Written Name";}
                        $('.ul-common-up').append("<li class='li-common-up'><strong>"+resp.hits.hits[i]._source.commonName+"</strong> ("+uriType+")</li><br>")
                    }
                    $('#common-list-up').append("</ul>");

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

            cNameObjectURIids = [];

            for(var i=0; i<resp.hits.hits.length; i++){
                cNameObjectURIids.push(resp.hits.hits[i]._source.URI.split("/")[resp.hits.hits[i]._source.URI.split("/").length-1]);
                $('#common-list-down').append(resp.hits.hits[i]._source.commonName+"<br>");
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


    function lookfForScientificNamesGivenCommonId(commonId){

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
                                    "default_field": "URI",
                                    "query": commonId
                                }
                            }
                        ]
                    }
                }
            }
        }).then(function (resp) {

            cNameObjectURIids = [];

            for(var i=0; i<resp.hits.hits.length; i++){
                cNameObjectURIids.push(resp.hits.hits[i]._source.URI.split("/")[resp.hits.hits[i]._source.URI.split("/").length-1]);
                //$('#common-list-down').append(resp.hits.hits[i]._source.commonName+"<br>");
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

                    $('#scientific-plant-name').html(resp.hits.hits[0]._source.scientificName)
                    appendFlickrPicture(resp.hits.hits[0]._source.scientificName,"scientific-down");

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


    function lookfForCommonNamesGivenCommonName(commonName){

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
                                    "query": "*"+commonName+"*",
                                    "phrase_slop": 1
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
            }

            console.log("Finished with "+resp.hits.hits.length);
            $('#common-list-down').append("<ul class='ul-common-down'>");
            for (var i = 0; i < resp.hits.hits.length; i++) {
                if(resp.hits.hits[i] != undefined)
                var uriType = "";
                if(resp.hits.hits[i]._source.URItype == "book_name_form"){uriType = "Book Name";}
                if(resp.hits.hits[i]._source.URItype == "phonetic_name_form"){uriType = "Phonetic Name";}
                if(resp.hits.hits[i]._source.URItype == "written_name_form"){uriType = "Written Name";}
                $('.ul-common-down').append("<li class='li-common-down'><strong>"+resp.hits.hits[i]._source.commonName+"</strong> ("+uriType+") <img class='img-mag' id='plant-"+i+"' src='/img/resources/mag-glass.svg.png'/></li><br>")
            }
            $('#common-list-down').append("</ul>");

            _.forEach(cNameObjectURIids, function(cnId,idx){
                $("#plant-"+idx).click(function() {
                    lookfForScientificNamesGivenCommonId(cNameObjectURIids[idx]);
                    $('.li-common-down').removeClass("selected");
                    $(this).parent().addClass("selected");
                });
            });

        }, function (err) {
            console.trace(err.message);
            return reject(err);
        });
    }


    ///////

    function appendFlickrPicture(term,zone){

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

                if(zone == "scientific-up"){
                    $("#scientific-zone-up .scientific-image").remove();
                    $("#scientific-zone-up").append('<img src="'+imgURL+'" class="scientific-image"/>');
                }
                else if(zone == "scientific-down"){
                    $("#scientific-zone-down .scientific-image").remove();
                    $("#scientific-zone-down").append('<img src="'+imgURL+'" class="scientific-image"/>');
                }
            }
        });
    }

})();

console.log("Plants aint a thing!")
