var mainExports = {};

(function() {

    var interval = undefined;
    var counter = 10;
    function setTimer(){
        $('#time-div').html(counter);
        $("#time-div").addClass("running");
        interval = setInterval(function() {
            counter--;
            $("#time-div").html(counter);
            if (counter <= 0) {
                $("#time-div").html("Time out!");
                $("#time-div").removeClass("running");
                $("#time-div").addClass("timeout");
                $('#newgame-div').removeClass("disabled");
                blockWebElements();

                // Give out the answer
                $('#plant-scientificName-input').addClass("wrong");
                $('#plant-scientificName-input').val(nameToGuess);
            }
        }, 1000);
    }

    function blockWebElements(){
        $('#tip-div').addClass("disabled");
        $('#submit-div').addClass("disabled");
        $('#newgame-div').removeClass("disabled");
        $('#plant-scientificName-input').prop('disabled', true);
        if(interval != undefined) clearInterval(interval);
    }

    function resetWebElements(){
        $('#plant-scientificName-input').removeClass("wrong");
        $('#plant-scientificName-input').removeClass("right");
        $('#tip-div').removeClass("disabled");
        $('#submit-div').removeClass("disabled");
        //$('#newgame-div').addClass("disabled");
        $("#time-div").removeClass("running");
        $("#time-div").removeClass("timeout");
        $('#plant-scientificName-input').prop('disabled', false);
        $('#plant-scientificName-input').val('');
        $("#plant-image").attr("src",'img/loading.gif');

        $("#submit-div").unbind('click');
        $("#tip-div").unbind('click');
        $("#newgame-div").unbind('click');

        counter = 10;
        $('#time-div').html(counter);
        if(interval != undefined) clearInterval(interval);
    }

    String.prototype.replaceAt=function(index, char) {
        var a = this.split("");
        a[index] = char;
        return a.join("");
    }

    // ELASTIC

    var ESToken = getToken();

    var esClient = new $.es.Client({
        host: getESHost(),
        headers: {
            'Authorization' : "Bearer " + ESToken}
        });

    var indexName = 'exp-rdf-plants-raw';

    var scientificNames = [
        "Achillea clavenae",
        "Achillea millefolium",
        //"Aconitum napelus",
        "Veratrum album",
        "Bellis perennis",
        "Convallaria majalis",
        "Lotus corniculatus",
        "Taraxacum officinale"
    ];

    var nameToGuess = "";
    var tipString = "";

    // Generate a new quiz

    generateNewQuiz();

    function generateNewQuiz(){

        // Reset the web elements
        resetWebElements();

        // Pick a random Scientific Name to guess
        nameToGuess = scientificNames[Math.floor(Math.random() * scientificNames.length) + 0];

        // Store the "tip string"
        var stringParts = nameToGuess.split(" ");
        tipString = "";
        for(var i=0; i<stringParts.length; i++){
            tipString += stringParts[i].replace(/./g, '*');
            if(i!=stringParts.length-1){tipString+=" ";}
        }

        // Then chain some ES queries to get a common name given to the user as a clue (plus a picture)
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
                                        "query": nameToGuess
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

                                for (var i = 0; i < resp.hits.hits.length; i++) {
                                    if(resp.hits.hits[i] != undefined)
                                    var uriType = "";
                                    if(resp.hits.hits[i]._source.URItype == "book_name_form"){uriType = "Book Name";}
                                    if(resp.hits.hits[i]._source.URItype == "phonetic_name_form"){uriType = "Phonetic Name";}
                                    if(resp.hits.hits[i]._source.URItype == "written_name_form"){uriType = "Written Name";}
                                    //$('body').append("<span><strong>"+resp.hits.hits[i]._source.commonName+"</strong> ("+uriType+")</span><br>")
                                }

                                // Here we have all of the common names of the random scientific name.
                                // We just have to pick one and offer it as a clue to the user

                                var randomCommonName = resp.hits.hits[Math.floor(Math.random() * resp.hits.hits.length) + 0]._source.commonName;

                                $('#plant-commonName-wrapper').html("<strong>Plant's Common Name: </strong>"+randomCommonName);
                                callEuropeana(nameToGuess);

                                $("#submit-div").click(function() {
                                    checkAnswer($("#plant-scientificName-input").val());
                                });
                                $("#tip-div").click(function() {
                                    giveTip();
                                });
                                $("#newgame-div").click(function() {
                                    if($('#newgame-div').hasClass('disabled')){return;}
                                    generateNewQuiz();
                                });
                            });

                        }, function (err) {
                            console.trace(err.message);
                        });

                    }, function (err) {
                        console.trace(err.message);
                        return reject(err);
                    });
                };

                function checkAnswer(answer) {

                    if($('#submit-div').hasClass('disabled')){return;}

                    if(answer.toLowerCase() == nameToGuess.toLowerCase()){ // Woo-hoo!
                        $('#plant-scientificName-input').removeClass("wrong");
                        $('#plant-scientificName-input').addClass("right");
                        blockWebElements();
                    }
                    else { // Meh...
                        $('#plant-scientificName-input').removeClass("right");
                        $('#plant-scientificName-input').addClass("wrong");
                        setTimeout(function() {
                            $('#plant-scientificName-input').removeClass("wrong");
                        }, 1800);
                        $('#plant-scientificName-input').prop('disabled', false);
                    }
                }

                function giveTip(){

                    if($('#tip-div').hasClass('disabled')){return;}

                    var indices = [];
                    for(var i=0; i<tipString.length;i++) {
                        if (tipString[i] === "*") indices.push(i);
                    }

                    var randomCharIndex = [Math.floor(Math.random() * indices.length) + 0];
                    tipString = tipString.replaceAt(indices[randomCharIndex], nameToGuess[indices[randomCharIndex]]);
                    $("#plant-scientificName-input").val(tipString);
                }

                function callEuropeana(queryString){

                    var europeanaImageObjects = [];

                    var params = null;

                    // Image Fetch

                    params = {
                        query: queryString,
                        qf: "TYPE:IMAGE",
                        rows: 100
                    };

                    $.ajax({
                        type: "POST",
                        url: "/api/europeana",
                        data: JSON.stringify(params),
                        contentType: 'application/json',
                        async: true,
                        success: function (response) {
                            if(response.totalResults == 0 || response.error != undefined){
                                $("#plant-image").attr("src",'img/ex.png');
                                setTimer();
                                return;
                            }

                            europeanaImageObjects = response.items;
                            var europeanaObjectToUse = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0]
                            var randomImage;
                            while(europeanaObjectToUse.edmPreview == undefined){
                                europeanaObjectToUse = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0]
                            }
                            randomImage = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0];
                            $("#plant-image").attr("src",randomImage.edmPreview[0]);

                            setTimer();
                        }
                    });
                }


            })();
