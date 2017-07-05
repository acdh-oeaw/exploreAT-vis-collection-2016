var mainExports = {};

(function() {

    // Helper helper hacky functions

    function shuffle(a) {
        for (let i = a.length; i; i--) {
            let j = Math.floor(Math.random() * i);
            [a[i - 1], a[j]] = [a[j], a[i - 1]];
        }
    }

    String.prototype.replaceAt=function(index, char) {
        var a = this.split("");
        a[index] = char;
        return a.join("");
    }



    // Reset the HTML at the start

    hideAll();
    $("#game-start").show();

    // Home Button handlers

    $(".question-card").click(function() {
        if($(this).attr("id") == "type-geography"){generateGeographyQuiz();}
        else if($(this).attr("id") == "type-commonName"){generateCommonNameQuiz();}
        else if($(this).attr("id") == "type-scientificName"){generateScientificNameQuiz();}
        else if($(this).attr("id") == "type-photo"){generatePhotoQuiz();}
        else if($(this).attr("id") == "type-submitFeedback"){generateFeedback();}

        if($(this).attr("id") == "grade-1"){goHome();}
        if($(this).attr("id") == "grade-2"){goHome();}
        if($(this).attr("id") == "grade-3"){goHome();}
        if($(this).attr("id") == "grade-4"){goHome();}
    });

    function hideAll(){
        $("#game-start").hide();
        $("#game-feedback").hide();
        $("#question-feedback").hide();
        $(".game-wrapper.wPhoto").hide();
        $(".game-wrapper.wScientific").hide();
        $(".game-wrapper.wCommon").hide();
        $(".game-wrapper.wGeography").hide();
    }

    function goHome(questionType){
        hideAll();
        $("#game-start").show();

        // Reset the timer
        counter = 10;
        $('.'+questionType+' #time-div').html(counter);
        if(interval != undefined) clearInterval(interval);

        // Reset variables
        loadedImages = 0;
    }

    function goGrade(questionType){
        hideAll();
        $("#question-feedback").show();
    }

    // Feedback handlers

    $("#sendFeedback").click(function(){
        $("#feedback-text").hide();
        $("#feedback-message").show();
        $("#sendFeedback").hide();
        //goHome("wFeedback");
    });

    $("#backFeedback").click(function(){
        hideAll();
        $("#feedback-text").val("");
        goGrade("wFeedback");
    });

    function generateFeedback(){
        hideAll();
        $("#game-feedback").show();
        $("#feedback-message").hide();
        $("#feedback-text").show();
        $("#sendFeedback").show();
    }

    // Time related variables

    var interval = undefined;
    var counter = 15;

    function setTimer(questionType){
        $('.'+questionType+' #time-div').html(counter);
        $('.'+questionType+' #time-div').addClass("running");
        $('.'+questionType+' #tip-div').removeClass("disabled");
        $('.'+questionType+' .option').removeClass("disabled");
        interval = setInterval(function() {
            counter--;
            $('.'+questionType+' #time-div').html(counter);
            if (counter <= 0) {
                $('.'+questionType+' #time-div').html("Time out!");
                $('.'+questionType+' #time-div').removeClass("running");
                $('.'+questionType+' #time-div').addClass("timeout");
                $('.'+questionType+' #newgame-div').removeClass("disabled");
                $('.'+questionType+' #grade-div').removeClass("disabled");
                blockWebElements(questionType);

                if(questionType == "wPhoto"){
                    // Highlight the answer
                    $('.'+questionType+' #submit-'+scientificNamesOptions.indexOf(nameToGuess)).removeClass("gray");
                    $('.'+questionType+' #submit-'+scientificNamesOptions.indexOf(nameToGuess)).addClass("green answer");
                }
                else if(questionType == "wScientific"){
                    // Highlight the answer
                    $('.'+questionType+' #submit-'+scientificNamesOptions.indexOf(nameToGuess)).removeClass("gray");
                    $('.'+questionType+' #submit-'+scientificNamesOptions.indexOf(nameToGuess)).addClass("green answer");
                }
                else if(questionType == "wCommon"){
                    // Highlight the answer
                    $('.'+questionType+' #submit-'+commonNamesOptions.indexOf(nameToGuess)).removeClass("gray");
                    $('.'+questionType+' #submit-'+commonNamesOptions.indexOf(nameToGuess)).addClass("green answer");
                }
                else if(questionType == "wGeography"){
                    // Highlight the answer
                    $('.'+questionType+' #submit-'+geographyOptions.indexOf(nameToGuess)).removeClass("gray");
                    $('.'+questionType+' #submit-'+geographyOptions.indexOf(nameToGuess)).addClass("green answer");
                }
            }
        }, 1000);
    }

    // Reset functions

    function blockWebElements(questionType){

        if(questionType == "wPhoto"){
            $('.'+questionType+' #tip-div').addClass("disabled");
            $('.'+questionType+' .option').addClass("disabled");
            $('.'+questionType+' #newgame-div').removeClass("disabled");
            $('.'+questionType+' #grade-div').removeClass("disabled");
            if(interval != undefined) clearInterval(interval);
        }
        else if(questionType == "wScientific"){
            $('.'+questionType+' #tip-div').addClass("disabled");
            $('.'+questionType+' .option').addClass("disabled");
            $('.'+questionType+' #newgame-div').removeClass("disabled");
            $('.'+questionType+' #grade-div').removeClass("disabled");
            if(interval != undefined) clearInterval(interval);
        }
        else if(questionType == "wCommon"){
            $('.'+questionType+' #tip-div').addClass("disabled");
            $('.'+questionType+' .option').addClass("disabled");
            $('.'+questionType+' #newgame-div').removeClass("disabled");
            $('.'+questionType+' #grade-div').removeClass("disabled");
            if(interval != undefined) clearInterval(interval);
        }
        else if(questionType == "wGeography"){
            $('.'+questionType+' #tip-div').addClass("disabled");
            $('.'+questionType+' .option').addClass("disabled");
            $('.'+questionType+' #newgame-div').removeClass("disabled");
            $('.'+questionType+' #grade-div').removeClass("disabled");
            if(interval != undefined) clearInterval(interval);
        }
    }

    function resetWebElements(questionType){

        if(questionType == "wPhoto"){
            loadedImages = 0;

            $('.'+questionType+' #tip-div').addClass("disabled"); // Enabled once the counter starts
            $('.'+questionType+' .option').addClass("disabled"); // Enabled once the counter starts

            $('.'+questionType+' #scientificName').html("");
            $('.'+questionType+' .option').removeClass("red");
            $('.'+questionType+' .option').removeClass("green");
            $('.'+questionType+' .option').removeClass("answer");
            $('.'+questionType+' .option').removeClass("fail");
            $('.'+questionType+' .option').addClass("gray");
            //$('#newgame-div').addClass("disabled");
            $('.'+questionType+' #time-div').removeClass("running");
            $('.'+questionType+' #time-div').removeClass("timeout");
            for(var i=0; i<4; i++){$("#plant-image-"+i).attr("src",'img/loading.gif');}

            $('.'+questionType+' #submit-0').unbind('click');
            $('.'+questionType+' #submit-1').unbind('click');
            $('.'+questionType+' #submit-2').unbind('click');
            $('.'+questionType+' #submit-3').unbind('click');
            $('.'+questionType+' #tip-div').unbind('click');
            $('.'+questionType+' #newgame-div').unbind('click');
            $('.'+questionType+' #grade-div').unbind('click');

            counter = 10;
            $('.'+questionType+' #time-div').html(counter);
            if(interval != undefined) clearInterval(interval);
        }
        else if(questionType == "wScientific"){
            $('.'+questionType+' #tip-div').addClass("disabled"); // Enabled once the counter starts
            $('.'+questionType+' .option').addClass("disabled"); // Enabled once the counter starts

            $('.'+questionType+' .option').removeClass("red");
            $('.'+questionType+' .option').removeClass("green");
            $('.'+questionType+' .option').removeClass("answer");
            $('.'+questionType+' .option').removeClass("fail");
            $('.'+questionType+' .option').addClass("gray");
            //$('#newgame-div').addClass("disabled");
            $('.'+questionType+' #time-div').removeClass("running");
            $('.'+questionType+' #time-div').removeClass("timeout");
            $('.'+questionType+' #plant-image').attr("src",'img/loading.gif');

            $('.'+questionType+' #submit-0').unbind('click');
            $('.'+questionType+' #submit-1').unbind('click');
            $('.'+questionType+' #submit-2').unbind('click');
            $('.'+questionType+' #submit-3').unbind('click');
            $('.'+questionType+' #tip-div').unbind('click');
            $('.'+questionType+' #newgame-div').unbind('click');
            $('.'+questionType+' #grade-div').unbind('click');

            counter = 10;
            $('.'+questionType+' #time-div').html(counter);
            if(interval != undefined) clearInterval(interval);
        }
        else if(questionType == "wCommon"){
            $('.'+questionType+' #tip-div').addClass("disabled"); // Enabled once the counter starts
            $('.'+questionType+' .option').addClass("disabled"); // Enabled once the counter starts

            $('.'+questionType+' .option').removeClass("red");
            $('.'+questionType+' .option').removeClass("green");
            $('.'+questionType+' .option').removeClass("answer");
            $('.'+questionType+' .option').removeClass("fail");
            $('.'+questionType+' .option').addClass("gray");
            //$('#newgame-div').addClass("disabled");
            $('.'+questionType+' #time-div').removeClass("running");
            $('.'+questionType+' #time-div').removeClass("timeout");
            $('.'+questionType+' #plant-image').attr("src",'img/loading.gif');

            $('.'+questionType+' #submit-0').unbind('click');
            $('.'+questionType+' #submit-1').unbind('click');
            $('.'+questionType+' #submit-2').unbind('click');
            $('.'+questionType+' #submit-3').unbind('click');
            $('.'+questionType+' #tip-div').unbind('click');
            $('.'+questionType+' #newgame-div').unbind('click');
            $('.'+questionType+' #grade-div').unbind('click');

            counter = 10;
            $('.'+questionType+' #time-div').html(counter);
            if(interval != undefined) clearInterval(interval);
        }
        else if(questionType == "wGeography"){
            $('.'+questionType+' #tip-div').addClass("disabled"); // Enabled once the counter starts
            $('.'+questionType+' .option').addClass("disabled"); // Enabled once the counter starts

            $('.'+questionType+' .option').removeClass("red");
            $('.'+questionType+' .option').removeClass("green");
            $('.'+questionType+' .option').removeClass("answer");
            $('.'+questionType+' .option').removeClass("fail");
            $('.'+questionType+' .option').addClass("gray");
            //$('#newgame-div').addClass("disabled");
            $('.'+questionType+' #time-div').removeClass("running");
            $('.'+questionType+' #time-div').removeClass("timeout");
            //$('.'+questionType+' #plant-image').attr("src",'img/loading.gif');

            $('.'+questionType+' #submit-0').unbind('click');
            $('.'+questionType+' #submit-1').unbind('click');
            $('.'+questionType+' #submit-2').unbind('click');
            $('.'+questionType+' #submit-3').unbind('click');
            $('.'+questionType+' #tip-div').unbind('click');
            $('.'+questionType+' #newgame-div').unbind('click');
            $('.'+questionType+' #grade-div').unbind('click');

            counter = 10;
            $('.'+questionType+' #time-div').html(counter);
            if(interval != undefined) clearInterval(interval);
        }
    }

    // ELASTIC

    var ESToken = getToken();

    var esClient = new $.es.Client({
        host: getESHost(),
        headers: {
            'Authorization' : "Bearer " + ESToken}
        });

    var indexName = 'exp-rdf-plants-raw';

    // Global variables regarding the plant names

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
    var commonNamesOptions = [];
    var geographyOptions = [];

    var nameToGuess = "";
    var selectedScientificName = "";

    var loadedImages = 0;

    // Game global variables

    var score = 0;
    var scoreToAdd = 10;

    function updateScore(questionType){
        if($('.'+questionType+' #tip-div').hasClass('disabled')){scoreToAdd = 5;}
        else{scoreToAdd = 10;}
        score += scoreToAdd;
        scoreToAdd = 10;

        $('.score').text('Score: '+score);
        console.log(score)
    }

    // Generate a Photo Quiz

    function generatePhotoQuiz(){

        // Clear the "Home Page", and present the "Photo Quiz"
        hideAll();
        $(".game-wrapper.wPhoto").show();

        // Reset the web elements
        resetWebElements("wPhoto");

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
                                $('.wPhoto #commonName').html("<strong>Plant's Common Name: </strong>"+randomCommonName);

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
                                callEuropeanaAtIndex("wPhoto",scientificNamesOptions[0],0);
                                callEuropeanaAtIndex("wPhoto",scientificNamesOptions[1],1);
                                callEuropeanaAtIndex("wPhoto",scientificNamesOptions[2],2);
                                callEuropeanaAtIndex("wPhoto",scientificNamesOptions[3],3);

                                // Create the listeners
                                $(".wPhoto #submit-0").click(function() {checkAnswer("wPhoto",0);});
                                $(".wPhoto #submit-1").click(function() {checkAnswer("wPhoto",1);});
                                $(".wPhoto #submit-2").click(function() {checkAnswer("wPhoto",2);});
                                $(".wPhoto #submit-3").click(function() {checkAnswer("wPhoto",3);});

                                $(".wPhoto #tip-div").click(function() {
                                    giveTip("wPhoto");
                                });

                                $(".wPhoto #newgame-div").click(function() {
                                    if($('.wPhoto #newgame-div').hasClass('disabled')){return;}
                                    goHome("wPhoto");
                                });

                                $(".wPhoto #grade-div").click(function() {
                                    if($('.wPhoto #grade-div').hasClass('disabled')){return;}
                                    goGrade('wPhoto');
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

                // Generate Scientific Quiz

                function generateScientificNameQuiz(){

                    // Clear the "Home Page", and present the "Scientific Quiz"
                    hideAll();
                    $(".game-wrapper.wScientific").show();

                    // Reset the web elements
                    resetWebElements("wScientific");

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
                                            $('.wScientific #plant-commonName-wrapper').html("<strong>Plant's Common Name: </strong>"+randomCommonName);

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

                                            $('.wScientific #submit-0').html(scientificNamesOptions[0]);
                                            $('.wScientific #submit-1').html(scientificNamesOptions[1]);
                                            $('.wScientific #submit-2').html(scientificNamesOptions[2]);
                                            $('.wScientific #submit-3').html(scientificNamesOptions[3]);

                                            // Show the picture
                                            callEuropeana("wScientific",nameToGuess);

                                            // Create the listeners
                                            $(".wScientific #submit-0").click(function() {checkAnswer("wScientific",0);});
                                            $(".wScientific #submit-1").click(function() {checkAnswer("wScientific",1);});
                                            $(".wScientific #submit-2").click(function() {checkAnswer("wScientific",2);});
                                            $(".wScientific #submit-3").click(function() {checkAnswer("wScientific",3);});

                                            $(".wScientific #tip-div").click(function() {
                                                giveTip("wScientific");
                                            });

                                            $(".wScientific #newgame-div").click(function() {
                                                if($('.wScientific #newgame-div').hasClass('disabled')){return;}
                                                goHome("wScientific");
                                            });

                                            $(".wScientific #grade-div").click(function() {
                                                if($('.wScientific #grade-div').hasClass('disabled')){return;}
                                                goGrade("wScientific");
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

                            // Generate Geography Quiz

                            function generateGeographyQuiz(){

                                // Clear the "Home Page", and present the "Scientific Quiz"
                                hideAll();
                                $(".game-wrapper.wGeography").show();

                                // Reset the web elements
                                resetWebElements("wGeography");
                                nameToGuess = "";
                                geographyOptions = [];

                                // Look for a bunch of random geography names
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
                                                                "field": "geography"
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    }).then(function (resp) {

                                        // Pick one random geography name as the name to guess
                                        var randomNumber = Math.floor(Math.random() * resp.hits.hits.length) + 0;
                                        nameToGuess = resp.hits.hits[randomNumber]._source.geography;

                                        var randomGeographyURI = resp.hits.hits[randomNumber]._source.URI;
                                        var randomGeographyURIid = randomGeographyURI.split("/")[resp.hits.hits[randomNumber]._source.URI.split("/").length-1];

                                        // Then pick another three random names just as filler
                                        geographyOptions = [];
                                        for(var i=0; i<resp.hits.hits.length; i++){
                                            geographyOptions.push(resp.hits.hits[i]._source.geography);
                                        }

                                        geographyOptions.splice(geographyOptions.indexOf(nameToGuess),1);
                                        shuffle(geographyOptions);

                                        while(geographyOptions.length > 3){
                                            var randomPos = Math.floor(Math.random() * geographyOptions.length) + 0;
                                            geographyOptions.splice(randomPos,1);
                                        }

                                        geographyOptions.push(nameToGuess);
                                        shuffle(geographyOptions);

                                        // Look for the URI id relative to the random common name that will be the
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
                                                                        "field": "relatedURI"
                                                                    }
                                                                }
                                                            ],
                                                            "should": [],
                                                            "minimum_should_match": 1
                                                        }
                                                    }
                                                }
                                            };

                                            queryObject.body.query.bool.should.push(
                                                {
                                                    "query_string": {
                                                        "default_field": "relatedURI",
                                                        "query": ''+randomGeographyURIid
                                                    }
                                                }
                                            );

                                            esClient.search(queryObject).then(function (resp) {

                                                var plantCommonURIids = [];

                                                for (var i = 0; i < resp.hits.hits.length; i++) {
                                                    plantCommonURIids.push(resp.hits.hits[i]._source.URI.split("/")[resp.hits.hits[i]._source.URI.split("/").length-1])
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

                                                    for(var i=0; i<plantCommonURIids.length; i++){
                                                        queryObject.body.query.bool.should.push(
                                                            {
                                                                "query_string": {
                                                                    "default_field": "URI",
                                                                    "query": ''+plantCommonURIids[i]
                                                                }
                                                            }
                                                        );
                                                    }

                                                    esClient.search(queryObject).then(function (resp) {

                                                        var selectedCommonName = resp.hits.hits[0]._source.commonName;

                                                        // We already have all of the information. Now just fill the question texts
                                                        $('.wGeography #plant-commonName-wrapper').html("<strong>Plant's Common Name: </strong>"+selectedCommonName);

                                                        $('.wGeography #submit-0').html(geographyOptions[0]);
                                                        $('.wGeography #submit-1').html(geographyOptions[1]);
                                                        $('.wGeography #submit-2').html(geographyOptions[2]);
                                                        $('.wGeography #submit-3').html(geographyOptions[3]);

                                                        // Show the picture (we should search the common name, but it doesn't usually fetch results)
                                                        //callEuropeana("wGeography",selectedCommonName);

                                                        // No photo in this type of question, so set the timer straight
                                                        setTimer("wGeography");

                                                        // Create the listeners
                                                        $(".wGeography #submit-0").click(function() {checkAnswer("wGeography",0);});
                                                        $(".wGeography #submit-1").click(function() {checkAnswer("wGeography",1);});
                                                        $(".wGeography #submit-2").click(function() {checkAnswer("wGeography",2);});
                                                        $(".wGeography #submit-3").click(function() {checkAnswer("wGeography",3);});

                                                        $(".wGeography #tip-div").click(function() {
                                                            giveTip("wGeography");
                                                        });

                                                        $(".wGeography #newgame-div").click(function() {
                                                            if($('.wGeography #newgame-div').hasClass('disabled')){return;}
                                                            goHome("wGeography");
                                                        });

                                                        $(".wGeography #grade-div").click(function() {
                                                            if($('.wGeography #grade-div').hasClass('disabled')){return;}
                                                            goGrade("wGeography");
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


                                        // Generate Common Quiz

                                        function generateCommonNameQuiz(){

                                            // Clear the "Home Page", and present the "Scientific Quiz"
                                            hideAll();
                                            $(".game-wrapper.wCommon").show();

                                            // Reset the web elements
                                            resetWebElements("wCommon");
                                            nameToGuess = "";
                                            commonNamesOptions = [];

                                            // Look for a bunch of random common names (our answer will be between them)
                                            esClient.search({
                                                index: indexName,
                                                type: indexName+'-type',
                                                headers: {
                                                    'Authorization' : "Bearer " + ESToken},
                                                    size: 500,
                                                    body: {
                                                        query: {
                                                            "bool" : {
                                                                "must": [
                                                                    {
                                                                        "exists": {
                                                                            "field": "commonName"
                                                                        }
                                                                    }
                                                                ]
                                                            }
                                                        }
                                                    }
                                                }).then(function (resp) {

                                                    // Pick one random common name as the name to guess
                                                    var randomNumber = Math.floor(Math.random() * resp.hits.hits.length) + 0;
                                                    nameToGuess = resp.hits.hits[randomNumber]._source.commonName;
                                                    var randomCommonURI = resp.hits.hits[randomNumber]._source.URI;
                                                    var randomCommonURIid = randomCommonURI.split("/")[resp.hits.hits[randomNumber]._source.URI.split("/").length-1];

                                                    // Then pick another three random names just as filler
                                                    commonNamesOptions = [];
                                                    for(var i=0; i<resp.hits.hits.length; i++){
                                                        commonNamesOptions.push(resp.hits.hits[i]._source.commonName);
                                                    }

                                                    commonNamesOptions.splice(commonNamesOptions.indexOf(nameToGuess),1);
                                                    shuffle(commonNamesOptions);

                                                    while(commonNamesOptions.length > 3){
                                                        var randomPos = Math.floor(Math.random() * commonNamesOptions.length) + 0;
                                                        commonNamesOptions.splice(randomPos,1);
                                                    }

                                                    commonNamesOptions.push(nameToGuess);
                                                    shuffle(commonNamesOptions);

                                                    // Look for the URI id relative to the random common name that will be the
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

                                                        queryObject.body.query.bool.should.push(
                                                            {
                                                                "query_string": {
                                                                    "default_field": "evokedByEntryWithURI",
                                                                    "query": ''+randomCommonURIid
                                                                }
                                                            }
                                                        );

                                                        esClient.search(queryObject).then(function (resp) {

                                                            var plantScientificURIids = [];

                                                            for (var i = 0; i < resp.hits.hits.length; i++) {
                                                                plantScientificURIids.push(resp.hits.hits[i]._source.URI.split("/")[resp.hits.hits[i]._source.URI.split("/").length-1])
                                                            }

                                                            /// Look for the located scientific name objects' data (the actual common name, as
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

                                                                for(var i=0; i<plantScientificURIids.length; i++){
                                                                    queryObject.body.query.bool.should.push(
                                                                        {
                                                                            "query_string": {
                                                                                "default_field": "URI",
                                                                                "query": ''+plantScientificURIids[i]
                                                                            }
                                                                        }
                                                                    );
                                                                }

                                                                esClient.search(queryObject).then(function (resp) {

                                                                    selectedScientificName = resp.hits.hits[0]._source.scientificName;

                                                                    // We already have all of the information. Now just fill the question texts
                                                                    $('.wCommon #plant-scientificName-wrapper').html("<strong>Plant's Scientific Name: </strong>"+selectedScientificName);

                                                                    $('.wCommon #submit-0').html(commonNamesOptions[0]);
                                                                    $('.wCommon #submit-1').html(commonNamesOptions[1]);
                                                                    $('.wCommon #submit-2').html(commonNamesOptions[2]);
                                                                    $('.wCommon #submit-3').html(commonNamesOptions[3]);

                                                                    // Show the picture (we should search the common name, but it doesn't usually fetch results)
                                                                    callEuropeana("wCommon",selectedScientificName);

                                                                    // Create the listeners
                                                                    $(".wCommon #submit-0").click(function() {checkAnswer("wCommon",0);});
                                                                    $(".wCommon #submit-1").click(function() {checkAnswer("wCommon",1);});
                                                                    $(".wCommon #submit-2").click(function() {checkAnswer("wCommon",2);});
                                                                    $(".wCommon #submit-3").click(function() {checkAnswer("wCommon",3);});

                                                                    $(".wCommon #tip-div").click(function() {
                                                                        giveTip("wCommon");
                                                                    });

                                                                    $(".wCommon #newgame-div").click(function() {
                                                                        if($('.wCommon #newgame-div').hasClass('disabled')){return;}
                                                                        goHome("wCommon");
                                                                    });

                                                                    $(".wCommon #grade-div").click(function() {
                                                                        if($('.wCommon #grade-div').hasClass('disabled')){return;}
                                                                        goGrade("wCommon");
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

                function checkAnswer(questionType, buttonNumber) {

                    if(questionType == "wPhoto"){
                        if($('.'+questionType+' #submit-'+buttonNumber).hasClass('disabled')){return;}

                        if(scientificNamesOptions[buttonNumber].toLowerCase() == nameToGuess.toLowerCase()){ // Woo-hoo!
                            $('.'+questionType+'  #submit-'+buttonNumber).removeClass("gray");
                            $('.'+questionType+' #submit-'+buttonNumber).addClass("green answer");
                            blockWebElements(questionType);
                            updateScore(questionType);
                        }
                        else { // Meh...
                            $('.'+questionType+' #submit-'+buttonNumber).removeClass("gray");
                            $('.'+questionType+' #submit-'+buttonNumber).addClass("fail");
                            // Mark the right option
                            $('.'+questionType+' #submit-'+scientificNamesOptions.indexOf(nameToGuess)).removeClass("gray");
                            $('.'+questionType+' #submit-'+scientificNamesOptions.indexOf(nameToGuess)).addClass("green answer");
                            blockWebElements(questionType);
                        }
                    }
                    else if(questionType == "wScientific"){
                        if($('.'+questionType+' #submit-'+buttonNumber).hasClass('disabled')){return;}

                        if(scientificNamesOptions[buttonNumber].toLowerCase() == nameToGuess.toLowerCase()){ // Woo-hoo!
                            $('.'+questionType+' #submit-'+buttonNumber).removeClass("gray");
                            $('.'+questionType+' #submit-'+buttonNumber).addClass("green answer");
                            blockWebElements(questionType);
                            updateScore(questionType);
                        }
                        else { // Meh...
                            $('.'+questionType+' #submit-'+buttonNumber).removeClass("gray");
                            $('.'+questionType+' #submit-'+buttonNumber).addClass("fail");
                            // Mark the right option
                            $('.'+questionType+' #submit-'+scientificNamesOptions.indexOf(nameToGuess)).removeClass("gray");
                            $('.'+questionType+' #submit-'+scientificNamesOptions.indexOf(nameToGuess)).addClass("green answer");
                            blockWebElements(questionType);
                        }
                    }
                    else if(questionType == "wCommon"){
                        if($('.'+questionType+' #submit-'+buttonNumber).hasClass('disabled')){return;}

                        if(commonNamesOptions[buttonNumber].toLowerCase() == nameToGuess.toLowerCase()){ // Woo-hoo!
                            $('.'+questionType+' #submit-'+buttonNumber).removeClass("gray");
                            $('.'+questionType+' #submit-'+buttonNumber).addClass("green answer");
                            blockWebElements(questionType);
                            updateScore(questionType);
                        }
                        else { // Meh...
                            $('.'+questionType+' #submit-'+buttonNumber).removeClass("gray");
                            $('.'+questionType+' #submit-'+buttonNumber).addClass("fail");
                            // Mark the right option
                            $('.'+questionType+' #submit-'+commonNamesOptions.indexOf(nameToGuess)).removeClass("gray");
                            $('.'+questionType+' #submit-'+commonNamesOptions.indexOf(nameToGuess)).addClass("green answer");
                            blockWebElements(questionType);
                        }
                    }
                    else if(questionType == "wGeography"){
                        if($('.'+questionType+' #submit-'+buttonNumber).hasClass('disabled')){return;}

                        if(geographyOptions[buttonNumber].toLowerCase() == nameToGuess.toLowerCase()){ // Woo-hoo!
                            $('.'+questionType+' #submit-'+buttonNumber).removeClass("gray");
                            $('.'+questionType+' #submit-'+buttonNumber).addClass("green answer");
                            blockWebElements(questionType);
                            updateScore(questionType);
                        }
                        else { // Meh...
                            $('.'+questionType+' #submit-'+buttonNumber).removeClass("gray");
                            $('.'+questionType+' #submit-'+buttonNumber).addClass("fail");
                            // Mark the right option
                            $('.'+questionType+' #submit-'+geographyOptions.indexOf(nameToGuess)).removeClass("gray");
                            $('.'+questionType+' #submit-'+geographyOptions.indexOf(nameToGuess)).addClass("green answer");
                            blockWebElements(questionType);
                        }
                    }
                }

                function giveTip(questionType){

                    if(questionType == "wPhoto"){
                        if($('.'+questionType+' #tip-div').hasClass('disabled')){return;}

                        // Disable two random options
                        var selectedPos = [];
                        var randomPos = Math.floor(Math.random() * scientificNamesOptions.length) + 0;
                        var disabledOptions = 0;
                        while(disabledOptions < 2){
                            if(randomPos != scientificNamesOptions.indexOf(nameToGuess) &&
                            selectedPos.indexOf(randomPos) == -1){
                                selectedPos.push(randomPos);
                                $('.'+questionType+' #submit-'+randomPos).addClass('disabled')
                                disabledOptions++;
                            }
                            randomPos = Math.floor(Math.random() * scientificNamesOptions.length) + 0;
                        }

                        // Give out Scientific Name
                        $('.'+questionType+' #scientificName').html("<strong>Plant's Scientific Name: </strong>"+nameToGuess);

                        $('.'+questionType+' #tip-div').addClass('disabled');
                    }
                    else if(questionType == "wScientific"){
                        if($('.'+questionType+' #tip-div').hasClass('disabled')){return;}

                        // Disable two random options
                        var selectedPos = [];
                        var randomPos = Math.floor(Math.random() * scientificNamesOptions.length) + 0;
                        var disabledOptions = 0;
                        while(disabledOptions < 2){
                            if(randomPos != scientificNamesOptions.indexOf(nameToGuess) &&
                            selectedPos.indexOf(randomPos) == -1){
                                selectedPos.push(randomPos);
                                $('.'+questionType+' #submit-'+randomPos).addClass('disabled')
                                disabledOptions++;
                            }
                            randomPos = Math.floor(Math.random() * scientificNamesOptions.length) + 0;
                        }

                        $('.'+questionType+' #tip-div').addClass('disabled');
                    }
                    else if(questionType == "wCommon"){
                        if($('.'+questionType+' #tip-div').hasClass('disabled')){return;}

                        // Disable two random options
                        var selectedPos = [];
                        var randomPos = Math.floor(Math.random() * commonNamesOptions.length) + 0;
                        var disabledOptions = 0;
                        while(disabledOptions < 2){
                            if(randomPos != commonNamesOptions.indexOf(nameToGuess) &&
                            selectedPos.indexOf(randomPos) == -1){
                                selectedPos.push(randomPos);
                                $('.'+questionType+' #submit-'+randomPos).addClass('disabled')
                                disabledOptions++;
                            }
                            randomPos = Math.floor(Math.random() * commonNamesOptions.length) + 0;
                        }

                        $('.'+questionType+' #tip-div').addClass('disabled');
                    }
                    else if(questionType == "wGeography"){
                        if($('.'+questionType+' #tip-div').hasClass('disabled')){return;}

                        // Disable two random options
                        var selectedPos = [];
                        var randomPos = Math.floor(Math.random() * geographyOptions.length) + 0;
                        var disabledOptions = 0;
                        while(disabledOptions < 2){
                            if(randomPos != geographyOptions.indexOf(nameToGuess) &&
                            selectedPos.indexOf(randomPos) == -1){
                                selectedPos.push(randomPos);
                                $('.'+questionType+' #submit-'+randomPos).addClass('disabled')
                                disabledOptions++;
                            }
                            randomPos = Math.floor(Math.random() * geographyOptions.length) + 0;
                        }

                        $('.'+questionType+' #tip-div').addClass('disabled');
                    }
                }

                function callEuropeana(questionType,queryString){

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

                            if(questionType == "wPhoto"){
                                if(response.totalResults == 0 || response.error != undefined){
                                    $(".'+questionType+' #plant-image").attr("src",'img/ex.png');
                                    setTimer(questionType);
                                    return;
                                }

                                europeanaImageObjects = response.items;
                                var europeanaObjectToUse = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0]
                                var randomImage;
                                while(europeanaObjectToUse.edmPreview == undefined){
                                    europeanaObjectToUse = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0]
                                }
                                randomImage = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0];
                                $(".'+questionType+' #plant-image").attr("src",randomImage.edmPreview[0]);

                                setTimer(questionType);
                            }
                            else if(questionType == "wScientific"){
                                if(response.totalResults == 0 || response.error != undefined){
                                    $('.'+questionType+' #plant-image').attr("src",'img/ex.png');
                                    setTimer(questionType);
                                    return;
                                }

                                europeanaImageObjects = response.items;
                                var europeanaObjectToUse = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0]
                                var randomImage;
                                while(europeanaObjectToUse.edmPreview == undefined){
                                    europeanaObjectToUse = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0]
                                }
                                randomImage = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0];
                                $('.'+questionType+' #plant-image').attr("src",randomImage.edmPreview[0]);

                                setTimer(questionType);
                            }
                            else if(questionType == "wCommon"){
                                if(response.totalResults == 0 || response.error != undefined){
                                    $('.'+questionType+' #plant-image').attr("src",'img/ex.png');
                                    setTimer(questionType);
                                    return;
                                }

                                europeanaImageObjects = response.items;
                                var europeanaObjectToUse = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0]
                                var randomImage;
                                while(europeanaObjectToUse.edmPreview == undefined){
                                    europeanaObjectToUse = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0]
                                }
                                randomImage = europeanaImageObjects[Math.floor(Math.random() * europeanaImageObjects.length) + 0];
                                $('.'+questionType+' #plant-image').attr("src",randomImage.edmPreview[0]);

                                setTimer(questionType);
                            }
                            else if(questionType == "wGeography"){

                            }
                        }
                    });
                }

                function callEuropeanaAtIndex(questionType,queryString,index){

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

                            if(questionType == "wPhoto"){
                                if(response.totalResults == 0 || response.error != undefined){
                                    $('.'+questionType+' #plant-image-'+index).attr("src",'img/ex.png');
                                    loadedImages++; if(loadedImages == 4){setTimer(questionType);}
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
                                    $('.'+questionType+' #plant-image-'+index).attr("src",randomImage.edmPreview[0]);

                                    loadedImages++; if(loadedImages == 4){setTimer(questionType);}
                                }
                            }
                            else if(questionType == "wScientific"){

                            }
                            else if(questionType == "wCommon"){

                            }
                            else if(questionType == "wGeography"){

                            }
                        }
                    });
                }


            })();
