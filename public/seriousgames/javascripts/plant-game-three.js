var mainExports = {};

(function() {

    function shuffle(a) {
        for (let i = a.length; i; i--) {
            let j = Math.floor(Math.random() * i);
            [a[i - 1], a[j]] = [a[j], a[i - 1]];
        }
    }

    var interval = undefined;
    var counter = 15;

    function setTimer(){
        $('#time-div').html(counter);
        $("#time-div").addClass("running");
        $('#tip-div').removeClass("disabled");
        $('.option').removeClass("disabled");
        interval = setInterval(function() {
            counter--;
            $("#time-div").html(counter);
            if (counter <= 0) {
                $("#time-div").html("Time out!");
                $("#time-div").removeClass("running");
                $("#time-div").addClass("timeout");
                $('#newgame-div').removeClass("disabled");
                blockWebElements();

                // Highlight the answer
                $('#submit-'+scientificNamesOptions.indexOf(nameToGuess)).removeClass("gray");
                $('#submit-'+scientificNamesOptions.indexOf(nameToGuess)).addClass("green answer");
            }
        }, 1000);
    }

    function blockWebElements(){
        $('#tip-div').addClass("disabled");
        $('.option').addClass("disabled");
        $('#newgame-div').removeClass("disabled");
        if(interval != undefined) clearInterval(interval);
    }

    function resetWebElements(){
        loadedImages = 0;

        $('#tip-div').addClass("disabled"); // Enabled once the counter starts
        $('.option').addClass("disabled"); // Enabled once the counter starts

        $('#scientificName').html("");
        $('.option').removeClass("red");
        $('.option').removeClass("green");
        $('.option').removeClass("answer");
        $('.option').removeClass("fail");
        $('.option').addClass("gray");
        //$('#newgame-div').addClass("disabled");
        $("#time-div").removeClass("running");
        $("#time-div").removeClass("timeout");
        for(var i=0; i<4; i++){$("#plant-image-"+i).attr("src",'img/loading.gif');}

        $("#submit-0").unbind('click');
        $("#submit-1").unbind('click');
        $("#submit-2").unbind('click');
        $("#submit-3").unbind('click');
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

    var scientificNamesOptions = [];

    var nameToGuess = "";

    var loadedImages = 0;

    // Generate a new quiz

    generateNewQuiz();

    function generateNewQuiz(){

        // Reset the web elements
        resetWebElements();

        // Pick a random Scientific Name to guess
        nameToGuess = scientificNames[Math.floor(Math.random() * scientificNames.length) + 0];
        scientificNamesOptions = [];

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
                                $('#commonName').html("<strong>Plant's Common Name: </strong>"+randomCommonName);

                                // Fill the option buttons with other three random names
                                scientificNamesOptions = [].concat(scientificNames);
                                scientificNamesOptions.splice(scientificNamesOptions.indexOf(nameToGuess),1);
                                shuffle(scientificNamesOptions);

                                while(scientificNamesOptions.length > 3){
                                    var randomPos = Math.floor(Math.random() * scientificNames.length) + 0;
                                    scientificNamesOptions.splice(randomPos,1);
                                }

                                scientificNamesOptions.push(nameToGuess);
                                shuffle(scientificNamesOptions);

                                // Show the picture
                                callEuropeanaAtIndex(scientificNamesOptions[0],0);
                                callEuropeanaAtIndex(scientificNamesOptions[1],1);
                                callEuropeanaAtIndex(scientificNamesOptions[2],2);
                                callEuropeanaAtIndex(scientificNamesOptions[3],3);

                                // Create the listeners
                                $("#submit-0").click(function() {checkAnswer(0);});
                                $("#submit-1").click(function() {checkAnswer(1);});
                                $("#submit-2").click(function() {checkAnswer(2);});
                                $("#submit-3").click(function() {checkAnswer(3);});

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

                function checkAnswer(buttonNumber) {

                    if($('#submit-'+buttonNumber).hasClass('disabled')){return;}

                    if(scientificNamesOptions[buttonNumber].toLowerCase() == nameToGuess.toLowerCase()){ // Woo-hoo!
                        $('#submit-'+buttonNumber).removeClass("gray");
                        $('#submit-'+buttonNumber).addClass("green answer");
                        blockWebElements();
                    }
                    else { // Meh...
                        $('#submit-'+buttonNumber).removeClass("gray");
                        $('#submit-'+buttonNumber).addClass("fail");
                        // Mark the right option
                        $('#submit-'+scientificNamesOptions.indexOf(nameToGuess)).removeClass("gray");
                        $('#submit-'+scientificNamesOptions.indexOf(nameToGuess)).addClass("green answer");
                        blockWebElements();
                    }
                }

                function giveTip(){

                    if($('#tip-div').hasClass('disabled')){return;}

                    // Disable two random options
                    var selectedPos = [];
                    var randomPos = Math.floor(Math.random() * scientificNamesOptions.length) + 0;
                    var disabledOptions = 0;
                    while(disabledOptions < 2){
                        if(randomPos != scientificNamesOptions.indexOf(nameToGuess) &&
                        selectedPos.indexOf(randomPos) == -1){
                            selectedPos.push(randomPos);
                            $('#submit-'+randomPos).addClass('disabled')
                            disabledOptions++;
                        }
                        randomPos = Math.floor(Math.random() * scientificNamesOptions.length) + 0;
                    }

                    // Give out Scientific Name
                    $('#scientificName').html("<strong>Plant's Scientific Name: </strong>"+nameToGuess);

                    $('#tip-div').addClass('disabled');
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

                function callEuropeanaAtIndex(queryString,index){

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
                                $("#plant-image-"+index).attr("src",'img/ex.png');
                                loadedImages++; if(loadedImages == 4){setTimer();}
                                return;
                            }

                            else{
                                europeanaImageObjects = response.items;
                                var europeanaObjectToUse = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0]
                                var randomImage;
                                while(europeanaObjectToUse.edmPreview == undefined){
                                    europeanaObjectToUse = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0]
                                }
                                randomImage = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0];
                                $("#plant-image-"+index).attr("src",randomImage.edmPreview[0]);

                                loadedImages++; if(loadedImages == 4){setTimer();}
                            }
                        }
                    });
                }


            })();
