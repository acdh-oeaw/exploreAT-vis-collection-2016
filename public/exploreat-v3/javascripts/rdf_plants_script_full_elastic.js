var mainExports = {};

(function() {

    // ELASTIC

    var ESToken = getToken();

    var esClient = new $.es.Client({
        host: getESHost()
    });

    var indexName = 'exp-rdf-plants-raw';

    // Listeners

    $( "#select-scientific" ).change(function() {
        if(this.value != "") {
            $("#common-list-up").html("");
            lookfForCommonNamesGivenScientificName(this.value);
            appendFlickrPicture(this.value,"scientific-up");

            $('#europeana-text').html("<h2>Texts</h2>");
            $('#europeana-audio').html("<h2>Audios</h2>");
            $('#europeana-video').html("<h2>Videos</h2>");
            $('#europeana-picture').html("<h2>Pictures</h2>");
            callEuropeana(this.value);
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
    var cNameObjects = [];
    var cNameObjectsUp = [];
    var europeanaTextObjects = [];
    var europeanaAudioObjects = [];
    var europeanaVideoObjects = [];
    var europeanaImageObjects = [];
    var europeanaAllObjects = [];

    // ElasticSearch Query Processing Functions

    function lookfForCommonNamesGivenScientificName(scientificName){

        // Look for the URI id relative to the written scientific name provided by the user

        esClient.search({
            index: indexName,
            type: indexName+'-type',
            headers: {
                'Authorization' : "Bearer " + ESToken},
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
                }

                /// Look for common names referencing (evoking) the located scientific name IDs

                var queryObject = {
                    index: indexName,
                    type: indexName+'-type',
                    headers: {
                        'Authorization' : "Bearer " + ESToken},
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
                            headers: {
                                'Authorization' : "Bearer " + ESToken},
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

                                cNameObjectsUp = [];

                                console.log("Finished with "+resp.hits.hits.length);
                                $('#common-list-up').append("<ul class='ul-common-up'>");
                                for (var i = 0; i < resp.hits.hits.length; i++) {
                                    if(resp.hits.hits[i] != undefined)
                                    cNameObjectsUp.push(resp.hits.hits[i]._source);
                                    var uriType = "";
                                    if(resp.hits.hits[i]._source.URItype == "book_name_form"){uriType = "Book Name";}
                                    if(resp.hits.hits[i]._source.URItype == "phonetic_name_form"){uriType = "Phonetic Name";}
                                    if(resp.hits.hits[i]._source.URItype == "written_name_form"){uriType = "Written Name";}
                                    $('.ul-common-up').append("<li class='li-common-up'><strong>"+resp.hits.hits[i]._source.commonName+"</strong> ("+uriType+") <img class='img-mag' id='plant-up-"+i+"' src='img/resources/mag-glass.svg.png'/></li><br>")
                                }
                                $('#common-list-up').append("</ul>");

                                _.forEach(cNameObjectsUp, function(cnId,idx){
                                    $("#plant-up-"+idx).click(function() {
                                        $('.li-common-up').removeClass("selected");
                                        $(this).parent().addClass("selected");
                                        $('#europeana-text').html("<h2>Texts</h2>");
                                        $('#europeana-audio').html("<h2>Audios</h2>");
                                        $('#europeana-video').html("<h2>Videos</h2>");
                                        $('#europeana-picture').html("<h2>Pictures</h2>");
                                        callEuropeana(cNameObjectsUp[idx]);
                                    });
                                });

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
                        headers: {
                            'Authorization' : "Bearer " + ESToken},
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
                            cNameObjects = [];

                            for(var i=0; i<resp.hits.hits.length; i++){
                                cNameObjectURIids.push(resp.hits.hits[i]._source.URI.split("/")[resp.hits.hits[i]._source.URI.split("/").length-1]);
                                $('#common-list-down').append(resp.hits.hits[i]._source.commonName+"<br>");
                            }

                            /// Look for scientific names referenced (evoked) by the located common name IDs

                            var queryObject = {
                                index: indexName,
                                type: indexName+'-type',
                                headers: {
                                    'Authorization' : "Bearer " + ESToken},
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
                                        headers: {
                                            'Authorization' : "Bearer " + ESToken},
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
                                    headers: {
                                        'Authorization' : "Bearer " + ESToken},
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
                                        }

                                        /// Look for scientific names referenced (evoked) by the located common name IDs

                                        var queryObject = {
                                            index: indexName,
                                            type: indexName+'-type',
                                            headers: {
                                                'Authorization' : "Bearer " + ESToken},
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
                                                    headers: {
                                                        'Authorization' : "Bearer " + ESToken},
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

                                            cNameObjects = [];
                                            cNameObjectURIids = [];

                                            // Look for the URI id relative to the written common name provided by the user

                                            esClient.search({
                                                index: indexName,
                                                type: indexName+'-type',
                                                headers: {
                                                    'Authorization' : "Bearer " + ESToken},
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
                                                        cNameObjects.push(resp.hits.hits[i]._source);
                                                    }

                                                    console.log("Finished with "+resp.hits.hits.length);
                                                    $('#common-list-down').append("<ul class='ul-common-down'>");
                                                    for (var i = 0; i < resp.hits.hits.length; i++) {
                                                        if(resp.hits.hits[i] != undefined)
                                                        var uriType = "";
                                                        if(resp.hits.hits[i]._source.URItype == "book_name_form"){uriType = "Book Name";}
                                                        if(resp.hits.hits[i]._source.URItype == "phonetic_name_form"){uriType = "Phonetic Name";}
                                                        if(resp.hits.hits[i]._source.URItype == "written_name_form"){uriType = "Written Name";}
                                                        $('.ul-common-down').append("<li class='li-common-down'><strong>"+resp.hits.hits[i]._source.commonName+"</strong> ("+uriType+") <img class='img-mag' id='plant-"+i+"' src='img/resources/mag-glass.svg.png'/></li><br>")
                                                    }
                                                    $('#common-list-down').append("</ul>");

                                                    _.forEach(cNameObjectURIids, function(cnId,idx){
                                                        $("#plant-"+idx).click(function() {
                                                            lookfForScientificNamesGivenCommonId(cNameObjectURIids[idx]);
                                                            $('.li-common-down').removeClass("selected");
                                                            $(this).parent().addClass("selected");
                                                            $('#europeana-text').html("<h2>Texts</h2>");
                                                            $('#europeana-audio').html("<h2>Audios</h2>");
                                                            $('#europeana-video').html("<h2>Videos</h2>");
                                                            $('#europeana-picture').html("<h2>Pictures</h2>");
                                                            callEuropeana(cNameObjects[idx]);
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
                                                            $("#scientific-zone-down .img-mag").remove();
                                                            $("#scientific-zone-down").append('<img src="'+imgURL+'" class="scientific-image"/>');
                                                            $("#scientific-plant-name").append("<img class='img-mag' id='sci-mag' src='img/resources/mag-glass.svg.png'/><br>");

                                                            $("#sci-mag").click(function() {
                                                                $('#europeana-text').html("<h2>Texts</h2>");
                                                                $('#europeana-audio').html("<h2>Audios</h2>");
                                                                $('#europeana-video').html("<h2>Videos</h2>");
                                                                $('#europeana-picture').html("<h2>Pictures</h2>");
                                                                callEuropeana(term);
                                                            });
                                                        }
                                                    }
                                                });
                                            }


                                            ////////

                                            function callEuropeana(plantObject){

                                                var queryString = "";

                                                if($.type(plantObject) === "string"){queryString = plantObject;}
                                                else{queryString = plantObject.commonName;}

                                                console.log(queryString);

                                                $('#europeana-commonName').html("Results for <strong>"+queryString+"</strong>")

                                                europeanaTextObjects = [];
                                                europeanaAudioObjects = [];
                                                europeanaVideoObjects = [];
                                                europeanaImageObjects = [];
                                                europeanaAllObjects = [];

                                                var params = null;

                                                // Text Fetch

                                                params = {
                                                    query: queryString,
                                                    qf: "TYPE:TEXT",
                                                    rows: 10
                                                };

                                                $.ajax({
                                                    type: "POST",
                                                    url: "api/europeana",
                                                    data: JSON.stringify(params),
                                                    contentType: 'application/json',
                                                    async: true,
                                                    success: function (response) {
                                                        if(response.totalResults == 0){
                                                            $('#europeana-text').append("<h3>There are <span class='error'>no texts</span> for <strong>"+queryString+"</h3></strong>")
                                                            return;
                                                        }

                                                        europeanaTextObjects = response.items;

                                                        _.forEach(europeanaTextObjects,function(euroRecord,idx){
                                                            var recordURL = euroRecord.guid;
                                                            var recordTitle = "";
                                                            if($.isArray(euroRecord.title)){recordTitle = euroRecord.title[0];}
                                                            else{recordTitle = euroRecord.title;}
                                                            $("#europeana-text").append('<a href="'+recordURL+'" target="_blank"><div class="europeana-card"><img class="europeana-card-image" src="img/resources/document.png"/><span id="text-'+idx+'">'+recordTitle+'</span></div>');
                                                        });
                                                    },
                                                    error: function(error){
                                                        console.log(error);
                                                        $('#europeana-text').append("There are <span class='error'>no results</span> for <strong>"+queryString+"</strong>")
                                                    }
                                                });

                                                // Audio Fetch

                                                params = {
                                                    query: queryString,
                                                    qf: "TYPE:SOUND",
                                                    rows: 10
                                                };

                                                $.ajax({
                                                    type: "POST",
                                                    url: "api/europeana",
                                                    data: JSON.stringify(params),
                                                    contentType: 'application/json',
                                                    async: true,
                                                    success: function (response) {
                                                        if(response.totalResults == 0){
                                                            $('#europeana-audio').append("<h3>There are <span class='error'>no audios</span> for <strong>"+queryString+"</h3></strong>")
                                                            return;
                                                        }

                                                        europeanaAudioObjects = response.items;

                                                        _.forEach(europeanaAudioObjects,function(euroRecord,idx){
                                                            var recordURL = euroRecord.guid;
                                                            var recordTitle = "";
                                                            if($.isArray(euroRecord.title)){recordTitle = euroRecord.title[0];}
                                                            else{recordTitle = euroRecord.title;}
                                                            $("#europeana-audio").append('<a href="'+recordURL+'" target="_blank"><div class="europeana-card"><img class="europeana-card-image" src="img/resources/audio.png"/><span id="audio-'+idx+'">'+recordTitle+'</div></span>');
                                                        });
                                                    },
                                                    error: function(error){
                                                        console.log(error);
                                                        $('#europeana-audio').append("There are <span class='error'>no audios</span> for <strong>"+queryString+"</strong>")
                                                    }
                                                });

                                                // Video Fetch

                                                params = {
                                                    query: queryString,
                                                    qf: "TYPE:VIDEO",
                                                    rows: 10
                                                };

                                                $.ajax({
                                                    type: "POST",
                                                    url: "api/europeana",
                                                    data: JSON.stringify(params),
                                                    contentType: 'application/json',
                                                    async: true,
                                                    success: function (response) {
                                                        if(response.totalResults == 0){
                                                            $('#europeana-video').append("<h3>There are <span class='error'>no videos</span> for <strong>"+queryString+"</h3></strong>")
                                                            return;
                                                        }

                                                        europeanaVideoObjects = response.items;

                                                        _.forEach(europeanaVideoObjects,function(euroRecord,idx){
                                                            var recordURL = euroRecord.guid;
                                                            var recordTitle = "";
                                                            if($.isArray(euroRecord.title)){recordTitle = euroRecord.title[0];}
                                                            else{recordTitle = euroRecord.title;}
                                                            $("#europeana-video").append('<a href="'+recordURL+'" target="_blank"><div class="europeana-card"><img class="europeana-card-image" src="img/resources/video.png"/><span id="audio-'+idx+'">'+recordTitle+'</div></span>');
                                                        });
                                                    },
                                                    error: function(error){
                                                        console.log(error);
                                                        $('#europeana-video').append("There are <span class='error'>no videos</span> for <strong>"+queryString+"</strong>")
                                                    }
                                                });

                                                // Image Fetch

                                                params = {
                                                    query: queryString,
                                                    qf: "TYPE:IMAGE",
                                                    rows: 10
                                                };

                                                $.ajax({
                                                    type: "POST",
                                                    url: "api/europeana",
                                                    data: JSON.stringify(params),
                                                    contentType: 'application/json',
                                                    async: true,
                                                    success: function (response) {
                                                        if(response.totalResults == 0){
                                                            $('#europeana-picture').append("<h3>There are <span class='error'>no images</span> for <strong>"+queryString+"</h3></strong>")
                                                            return;
                                                        }

                                                        europeanaImageObjects = response.items;
                                                        console.log(europeanaImageObjects)

                                                        _.forEach(europeanaImageObjects,function(euroRecord,idx){
                                                            var imgURL = "";
                                                            if(euroRecord.edmPreview != undefined) imgURL = euroRecord.edmPreview[0];
                                                            var recordURL = euroRecord.guid;
                                                            $("#europeana-picture .scientific-image").remove();
                                                            $("#europeana-picture").append('<a href="'+recordURL+'" target="_blank"><img src="'+imgURL+'" class="europeana-image" id="image-'+idx+'" style="vertical-align:top;"/></a>');
                                                        });

                                                        $('.europeana-image').mouseover(function(){
                                                            var imgID = $(this).attr("id").split("-")[1];
                                                            var imgData = "";
                                                            europeana_tooltip.show();
                                                            if(europeanaImageObjects[imgID].dcTitleLangAware != undefined &&
                                                                europeanaImageObjects[imgID].dcTitleLangAware.def != undefined &&
                                                                europeanaImageObjects[imgID].dcTitleLangAware.def[0].length >= 16){
                                                                    imgData = '"<strong>'+europeanaImageObjects[imgID].dcTitleLangAware.def[0].substring(0, 16)+'...</strong>"';
                                                                }
                                                                else if(europeanaImageObjects[imgID].dcTitleLangAware != undefined &&
                                                                    europeanaImageObjects[imgID].dcTitleLangAware.def != undefined){
                                                                        imgData = '"<strong>'+europeanaImageObjects[imgID].dcTitleLangAware.def[0]+'</strong>"';
                                                                    }
                                                                    else {
                                                                        imgData = "the record";
                                                                    }
                                                                    europeana_tooltip.html('<strong>Click</strong> to access '+imgData+' on Europeana');
                                                                });
                                                                $('.europeana-image').mouseout(function(){
                                                                    europeana_tooltip.hide();
                                                                    europeana_tooltip.html('');
                                                                });
                                                            },
                                                            error: function(error){
                                                                console.log(error);
                                                                $('#europeana-picture').append("There are <span class='error'>no results</span> for <strong>"+queryString+"</strong>")
                                                            }
                                                        });

                                                        // Fetch all and plot map related to locations of records found (if any has that info...)

                                                        params = {
                                                            query: queryString,
                                                            profile: "rich",
                                                            rows: 500,
                                                        };

                                                        $('#map-header').html("<h3>Looking for geolocated docs...</h3>")

                                                        $.ajax({
                                                            type: "POST",
                                                            url: "api/europeana",
                                                            data: JSON.stringify(params),
                                                            contentType: 'application/json',
                                                            async: true,
                                                            success: function (response) {
                                                                if(response.totalResults == 0){
                                                                    $('#map-header').html("<h3>There are <span class='error'>no geolocated docs</span> for <strong>"+queryString+"</h3></strong>")
                                                                    return;
                                                                }

                                                                console.log(response);

                                                                europeanaAllObjects = [];

                                                                if(response.totalResults == 0){
                                                                    return;
                                                                }

                                                                _.forEach(response.items, function(item, idx){
                                                                    if(item.edmPlaceLabel != undefined){
                                                                        europeanaAllObjects.push(item);
                                                                    }
                                                                });

                                                                console.log(europeanaAllObjects);

                                                                plotDataInMap();
                                                            },
                                                            error: function(error){
                                                                console.log(error);
                                                                $('#map-header').html("<h3>There was a <span class='error'timeout</span>. Please, try again.</h3>")
                                                            }
                                                        });
                                                    }


                                                    var europeana_tooltip = $('#europeana-tooltip');

                                                    function setupFloatingDivs() {
                                                        europeana_tooltip.hide();

                                                        $(document).mousemove(function(e){
                                                            europeana_tooltip.css({'top': e.pageY-30,'left': e.pageX-60});
                                                        });
                                                    }

                                                    setupFloatingDivs();

                                                    // MAP CODE

                                                    var m_width = $("#map").width(),
                                                    width = 700,
                                                    height = 400,
                                                    country,
                                                    state;

                                                    var projection = d3.geo.mercator()
                                                    .scale(120)
                                                    .translate([width / 2, height / 1.5]);

                                                    var path = d3.geo.path()
                                                    .projection(projection);

                                                    var svg = d3.select("#map").append("svg")
                                                    .attr("preserveAspectRatio", "xMidYMid")
                                                    .attr("viewBox", "0 0 " + width + " " + height)
                                                    .attr("width", m_width)
                                                    .attr("height", m_width * height / width);

                                                    svg.append("rect")
                                                    .attr("class", "background")
                                                    .attr("width", width)
                                                    .attr("height", height)
                                                    .on("click", country_clicked);

                                                    var g = svg.append("g");

                                                    d3.json("data/world/countries.topo.json", function(error, us) {
                                                        g.append("g")
                                                        .attr("id", "countries")
                                                        .selectAll("path")
                                                        .data(topojson.feature(us, us.objects.countries).features)
                                                        .enter()
                                                        .append("path")
                                                        .attr("id", function(d) { return d.id; })
                                                        .attr("d", path)
                                                        .attr("class", "country")
                                                        .on("click", country_clicked);
                                                    });

                                                    function zoom(xyz) {
                                                        g.transition()
                                                        .duration(750)
                                                        .attr("transform", "translate(" + projection.translate() + ")scale(" + xyz[2] + ")translate(-" + xyz[0] + ",-" + xyz[1] + ")")
                                                        .selectAll(["#countries"])
                                                        .style("stroke-width", 1.0 / xyz[2] + "px");
                                                    }

                                                    function get_xyz(d) {
                                                        var bounds = path.bounds(d);
                                                        var w_scale = (bounds[1][0] - bounds[0][0]) / width;
                                                        var h_scale = (bounds[1][1] - bounds[0][1]) / height;
                                                        var z = .96 / Math.max(w_scale, h_scale);
                                                        var x = (bounds[1][0] + bounds[0][0]) / 2;
                                                        var y = (bounds[1][1] + bounds[0][1]) / 2 + (height / z / 6);
                                                        return [x, y, z];
                                                    }

                                                    function country_clicked(d) {
                                                        g.selectAll(["#states"]).remove();
                                                        state = null;

                                                        if (country) {
                                                            g.selectAll("#" + country.id).style('display', null);
                                                        }

                                                        if (d && country !== d) {
                                                            var xyz = get_xyz(d);
                                                            country = d;
                                                            zoom(xyz);
                                                        } else {
                                                            var xyz = [width / 2, height / 1.5, 1];
                                                            country = null;
                                                            zoom(xyz);
                                                        }
                                                    }

                                                    $(window).resize(function() {
                                                        var w = $("#map").width();
                                                        svg.attr("width", w);
                                                        svg.attr("height", w * height / width);
                                                    });

                                                    // EUROPEANA DATA TO MAP

                                                    function plotDataInMap(){

                                                        var places = [];

                                                        _.forEach(europeanaAllObjects, function (object,idx) {
                                                            var place = {};
                                                            place.name = object.edmPlaceLabel[0].def;
                                                            place.location = {};
                                                            if(object.edmPlaceLatitude != undefined && object.edmPlaceLongitude != undefined){
                                                                place.location.latitude = parseFloat(object.edmPlaceLatitude[0]) + (Math.random()/3);
                                                                place.location.longitude = parseFloat(object.edmPlaceLongitude[0]) + (Math.random()/3);
                                                                place.url = object.guid;
                                                                places.push(place);
                                                            }
                                                        });

                                                        $('.pin').remove();

                                                        if(places.length != 0){
                                                            $('#map-header').html("")
                                                        }

                                                        d3.select("#countries").selectAll(".pin")
                                                        .data(places)
                                                        .enter().append("circle")
                                                        .attr("r", 1)
                                                        .attr("transform", function(d) {
                                                            return "translate(" + projection([
                                                                d.location.longitude,
                                                                d.location.latitude
                                                            ]) + ")";
                                                        })
                                                        .attr("class", "pin")
                                                        .on("click", function(d){window.open(d.url, "_blank", "toolbar=1", "scrollbars=1", "resizable=1", "width=" + 500 + ", height=" + 500);})
                                                        .append("svg:title")
                                                        .text(function(d) { return d.name; })
                                                        ;
                                                    }

                                                })();
