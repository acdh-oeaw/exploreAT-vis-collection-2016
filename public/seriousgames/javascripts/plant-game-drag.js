var mainExports = {};

(function() {

    function shuffle(a) {
        for (let i = a.length; i; i--) {
            let j = Math.floor(Math.random() * i);
            [a[i - 1], a[j]] = [a[j], a[i - 1]];
        }
    }

    function blockWebElements(){
        $('#newgame-div').removeClass("disabled");
    }

    function resetWebElements(){
        $(".plant-image").attr("src",'img/loading.gif');
        $("#newgame-div").unbind('click');

        $('.common-card').remove();
        $('.scientific-card').remove();
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
        //"Veratrum album",
        "Bellis perennis",
        "Convallaria majalis",
        //"Lotus corniculatus",
        "Taraxacum officinale"
    ];

    var namePairs = [];
    var errors = 0;

    function resetGame(){

        shuffle(scientificNames);
        namePairs = [];
        errors = 0;
        $("#counter").html(errors);

        // Get one common name per scientific name
        for(var i=0; i<scientificNames.length; i++){
            getCommonFromScientific(scientificNames[i]);
        }
    }

    resetGame();

    // Get a common name from a scientific name

    function getCommonFromScientific(providedScientificName){

        // Chain some ES queries to get a common name given to the user as a clue (plus a picture)
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
                                        "query": providedScientificName
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
                                // We just have to pick one, that we will have to drag and drop in the correct spot
                                var randomCommonName = resp.hits.hits[Math.floor(Math.random() * resp.hits.hits.length) + 0]._source.commonName;
                                namePairs.push(providedScientificName+";"+randomCommonName);

                                // If this is the last scientific-common pair, then proceed to create the game structre
                                if(namePairs.length >= scientificNames.length){
                                    generateNewQuiz();
                                }
                            });

                        }, function (err) {
                            console.trace(err.message);
                        });

                    }, function (err) {
                        console.trace(err.message);
                        return reject(err);
                    });

                }

                function generateNewQuiz(){

                    // Reset the web elements
                    resetWebElements();

                    // Shuffle the pairs and the scientific names
                    shuffle(namePairs);
                    shuffle(scientificNames);

                    // Generate the Common name cards
                    for(var i=0; i<namePairs.length; i++){
                        var html = '';
                        html += '<div id="common-'+i+'" class="common-card">';
                        html += namePairs[i].split(";")[1];
                        html += '</div>';
                        $("#plant-commonName-wrapper").append(html);
                    }

                    // Generate the Scientific name slots
                    for(var i=0; i<scientificNames.length; i++){
                        var html = '';
                        html += '<div id="scientific-'+i+'" class="scientific-card">';
                        html += scientificNames[i];
                        html += '</div>';
                        $("#plant-scientificName-wrapper").prepend(html);
                    }

                    // Make the common names draggable
                    $(".common-card").draggable({
                        revert: true
                    });
                    $(".scientific-card").droppable({
                        drop: function( event, ui ) {
                            if(namePairs[parseInt(ui.draggable[0].id.split("-")[1])].split(";")[0] == scientificNames[parseInt($(this).attr("id").split("-")[1])]){
                                $(this).addClass( "blocked" );
                                ui.draggable.addClass( 'correct' );
                                ui.draggable.draggable( 'disable' );
                                $(this).droppable( 'disable' );
                                ui.draggable.position( { of: $(this), my: 'center center', at: 'center center' } );
                                ui.draggable.draggable( 'option', 'revert', false );
                            }
                            else {
                                errors++;
                                $("#counter").html(errors);
                            }
                        }
                    });

                    // Show the picture
                    //callEuropeana(nameToGuess);

                    $("#newgame-div").click(function() {
                        if($('#newgame-div').hasClass('disabled')){return;}
                        resetGame();
                    });
                }

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
                        url: "api/europeana",
                        data: JSON.stringify(params),
                        contentType: 'application/json',
                        async: true,
                        success: function (response) {
                            if(response.totalResults == 0){
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
