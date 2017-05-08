///// DATA

var wordsArray = new Array();
var wordsArrayFiltered = new Array();
var minYear = 9999; var selectedMinYear = 0;
var maxYear = 0; var selectedMaxYear = 0;
var partsOfSpeechData = new Array();

var unkTotal = 0;
var unkFound = 0;
var susTotal = 0;
var susFound = 0;
var adjTotal = 0;
var adjFound = 0;
var advTotal = 0;
var advFound = 0;
var verTotal = 0;
var verFound = 0;

var showWordsWithoutYear = true;

var svgWords;

// HELPERS

var scaleRadius;
var heatmapColors;
var heatmapScale;
var c;
var partOfSpeechColors = {
    "Unbekannt": "#a6cee3",
    "Pronom": "#1f78b4",
    "Adjektiv": "#b2df8a",
    "Verb": "#33a02c",
    "Numerale": "#fb9a99",
    "Substantiv": "#e31a1c",
    "Adverb": "#fdbf6f",
    "Präposition": "#ff7f00",
    "Konjunktion": "#cab2d6",
    "Interjektion": "#6a3d9a",
    "Präfix/Suffix": "#ffff99"
};

var info_tooltip = $('#info-tooltip');

///// MAP

var width = Math.max(960, window.innerWidth),
height = 500,
scale = 4000;

var projection = d3.geo.stereographic()
.center([15.0972, 47.3817])
.scale(scale)
.translate([width / 2, height / 2]);

var path = d3.geo.path()
.projection(projection)
.pointRadius(2);

var svg = d3.select("#map").append("svg")
.attr("width", width)
.attr("height", height);

var g = svg.append("g");

var zoom = d3.behavior.zoom()
.translate([width / 2, height / 2])
.scale(scale)
//.scaleExtent([scale, 8 * scale])
.scaleExtent([scale, 16 * scale])
.on("zoom", zoomed);

svg.call(zoom).call(zoom.event);

function zoomed() {
    projection
    .translate(zoom.translate())
    .scale(zoom.scale());

    g.selectAll("path")
    .attr("d", path);

    g.selectAll("text")
    .attr("transform", function (d) {
        return "translate(" + path.centroid(d) + ")";
    });
}

var q = d3_queue.queue();

q.defer(d3.json, "data/exploreAT.json")
.await(makeMap);

function makeMap(error, exploreAT, target) {

    var subunits = topojson.feature(exploreAT, exploreAT.objects.subunits);
    var places = topojson.feature(exploreAT, exploreAT.objects.places);

    g.selectAll(".subunit")
    .data(subunits.features)
    .enter().append("path")
    .attr("class", function (d) {
        return "subunit " + d.id;
    })
    .attr("d", path);

    g.append("path")
    .datum(topojson.mesh(exploreAT, exploreAT.objects.subunits, function (a, b) {
        return a !== b && a.id !== "DEU";
    }))
    .attr("d", path)
    .attr("class", "subunit-boundary");

    g.append("path")
    .datum(topojson.mesh(exploreAT, exploreAT.objects.subunits, function (a, b) {
        return a === b && a.id === "AUT";
    }))
    .attr("d", path)
    .attr("class", "subunit-boundary AUT");

    g.selectAll(".subunit-label")
    .data(subunits.features)
    .enter().append("text")
    .attr("class", function (d) {
        return "subunit-label " + d.id;
    })
    .attr("transform", function (d) {
        return "translate(" + path.centroid(d) + ")";
    })
    .attr("dy", ".35em")
    .text(function (d) {
        return d.properties.name;
    });

    g.append("path")
    .datum(places)
    .attr("d", path)
    .attr("class", "place AT");

    g.selectAll(".place-label AT")
    .data(places.features)
    .enter().append("text")
    .attr("class", "place-label AT")
    .attr("transform", function (d) {
        return "translate(" + projection(d.geometry.coordinates) + ")";
    })
    .attr("x", function (d) {
        return d.geometry.coordinates[0] > -1 ? 6 : -6;
    })
    .attr("dy", ".35em")
    .style("text-anchor", function (d) {
        return d.geometry.coordinates[0] > -1 ? "start" : "end";
    })
    .text(function (d) {
        return d.properties.name;
    })
    .on("mouseover", function(){return;})
    .on("mouseout", function(){return;});


    // Map loaded. Bind actions to the data loading buttons
    $('#loadFromLemma').on("click", function(){
        d3.select('#spinner').classed('hidden',false);
        d3.select('#loadFromLemma').remove();
        d3.select('#loadFromBeleg').remove();
        createWords("lemma");
    });
    $('#loadFromBeleg').on("click", function(){
        d3.select('#spinner').classed('hidden',false);
        d3.select('#loadFromLemma').remove();
        d3.select('#loadFromBeleg').remove();
        createWords("beleg");
    });

    // Prepare floating DIV
    setupFloatingDiv();
}

// METHODS

function setupFloatingDiv() {
    info_tooltip.hide();

    $(document).mousemove(function(e){
        info_tooltip.css({'top': e.pageY-14,'left': e.pageX+20});
    });
}

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

// Call for the persons stored in the DB
function createWords(table) {

    $.ajax({
        type: "GET",
        url: "api/words/"+table,
        dataType: "json",
        timeout: 120000,
        async: true,
        success: function (response) {

            // Create a Feature for each Word
            for(var i=0; i<response.rows.length; i++){

                if(!isNaN(response.rows[i].year) && response.rows[i].year > 1000){

                    if(parseInt(response.rows[i].year) < minYear) minYear = parseInt(response.rows[i].year);
                    if(parseInt(response.rows[i].year) > maxYear) maxYear = parseInt(response.rows[i].year);

                    selectedMinYear = minYear;
                    selectedMaxYear = maxYear;
                }

                if((partsOfSpeechData.indexOf(response.rows[i].partOfSpeech) > -1) == false){
                    partsOfSpeechData.push(response.rows[i].partOfSpeech);
                }

                if(response.rows[i].partOfSpeech == "Unbekannt"){unkTotal++; unkFound=unkTotal;}
                if(response.rows[i].partOfSpeech == "Adjektiv"){adjTotal++; adjFound=adjTotal;}
                if(response.rows[i].partOfSpeech == "Substantiv"){susTotal++; susFound=susTotal;}
                if(response.rows[i].partOfSpeech == "Adverb"){advTotal++; advFound=advTotal;}
                if(response.rows[i].partOfSpeech == "Verb"){verTotal++; verFound=verTotal;}

                // Create a new Wicket instance
                var wkt = new Wkt.Wkt();
                wkt.read(response.rows[i].geometry);

                var jitterModifier = 0.03;
                var coordinatesJitter = wkt.toJson().coordinates;
                coordinatesJitter[0] = coordinatesJitter[0] + getRandom(-jitterModifier,jitterModifier);
                coordinatesJitter[1] = coordinatesJitter[1] + getRandom(-jitterModifier,jitterModifier);

                var geoJSONobject = {
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "geometry": {
                                "type": wkt.toJson().type,
                                "coordinates": coordinatesJitter
                            },
                            "properties": {
                                "word": response.rows[i].word,
                                "year": response.rows[i].year,
                                "partOfSpeech": response.rows[i].partOfSpeech,
                                "quelleSource": response.rows[i].quelleSource,
                                "locationName": response.rows[i].locationName,
                            }
                        }
                    ]
                }

                wordsArray.push(geoJSONobject);
            }

            setupHTML();
            prepareWordHelpers();
        }
    });
}

function setupHTML() {
    setupWordFilter();
    setupSpeechFilter();
    setupYearFilter();
    d3.select('#spinner').remove();
}

function setupWordFilter() {

    // WORD FILTER

    d3.select('#fieldFilter').classed('hidden',false);

    $('#searchField').keyup(function(){
        handleFilters();
    });

    $('#clearFieldButton').on("click", function(){
        $('#searchField').val("");
        handleFilters();
    });

    $('#searchFieldButton').on("click", function(){

        handleFilters();
    });
}

function setupSpeechFilter() {

    // SPEECH FILTER

    for(var i=0; i<partsOfSpeechData.length; i++){
        $('#speechFilter').append(function(){
            var html = '';
            html += '<div class="speechOptionBar '+partsOfSpeechData[i]+'">';
            html += '<div class="speechBubble '+partsOfSpeechData[i]+'"></div>'+partsOfSpeechData[i];
            if(partsOfSpeechData[i] == "Unbekannt"){html += ' <span class="kindCounter '+partsOfSpeechData[i]+'">('+unkFound+')';}
            else if(partsOfSpeechData[i] == "Adjektiv"){html += ' <span class="kindCounter '+partsOfSpeechData[i]+'">('+adjFound+')';}
            else if(partsOfSpeechData[i] == "Adverb"){html += ' <span class="kindCounter '+partsOfSpeechData[i]+'">('+advFound+')';}
            else if(partsOfSpeechData[i] == "Substantiv"){html += ' <span class="kindCounter '+partsOfSpeechData[i]+'">('+susFound+')';}
            else if(partsOfSpeechData[i] == "Verb"){html += ' <span class="kindCounter '+partsOfSpeechData[i]+'">('+verFound+')';}
            html += '</div>';
            return html;
        })

        $('.speechOptionBar.'+partsOfSpeechData[i]).on("click", function(){
            d3.selectAll('.speechBubble').classed("selected", false);
            d3.select('.speechBubble.'+$(this).attr("class").split(" ")[1]).classed("selected", true);
            handleFilters();
        });
    }

    // Clear Speech Filter option
    $('#speechFilter').append(function(){
        var html = '';
        html += '<div class="speechOptionBar Clear">';
        html += '<div class="speechBubble Clear selected"></div>All <span class="kindCounter Clear">('+wordsArray.length+')';
        html += '</div>';
        return html;
    })

    // Clear Speech Filter Listener
    $('.speechOptionBar.Clear').on("click", function(){
        d3.selectAll('.speechBubble').classed("selected", false);
        d3.select('.speechBubble.'+$(this).attr("class").split(" ")[1]).classed("selected", true);
        handleFilters();
    });

    d3.select('#speechFilter').classed('hidden',false);
}

function setupYearFilter() {

    // YEAR FILTER

    $('#minYearLabel').html(minYear);
    $('#maxYearLabel').html(maxYear);

    $('#sliderYears').noUiSlider({
        start: [ minYear, maxYear ],
        step: 1,
        connect: true,
        range: {
            'min':  minYear,
            'max':  maxYear
        }
    });

    // Actions
    $("#sliderYears").on({
        set: function(){ // Action when the handler is dropped

            // Get min/max years
            selectedMinYear = $("#sliderYears").val()[0].replace('.00','');
            selectedMaxYear = $("#sliderYears").val()[1].replace('.00','');

            $('#minYearLabel').html(selectedMinYear);
            $('#maxYearLabel').html(selectedMaxYear);

            handleFilters();
        },
        change: function(){},
        slide: function(){}
    });

    // CHECK FILTER

    $('#checkYear').change(function() {
        showWordsWithoutYear = !showWordsWithoutYear;
        handleFilters();
    });

    d3.select('#yearFilter').classed('hidden',false);
}

function prepareWordHelpers() {

    scaleRadius = d3.scale.linear()
    .domain([maxYear, minYear])
    .range([8,1]);

    heatmapColors = ["#d7191c", "#ffffbf", "#1a9641"];
    heatmapScale = d3.scale.linear()
    .domain([-1,0,1])
    .range(heatmapColors);
    c = d3.scale.linear().domain([minYear,maxYear]).range([-1,0,1]);

    wordsArrayFiltered = wordsArray;

    drawMap();
}

function handleFilters(){

    wordsArrayFiltered = [];
    unkFound = susFound = adjFound = advFound = verFound = 0;

    for(var i=0; i<wordsArray.length; i++){

        // If the search field is empty or the word cointains the field's text
        if(wordsArray[i].features[0].properties.word.toLowerCase().indexOf($('#searchField').val().toLowerCase()) > -1 ||
        $('#searchField').val() == "") {

            // If the word is of the selected part of speech or we're showing all of the words
            if(wordsArray[i].features[0].properties.partOfSpeech == $('.speechBubble.selected').attr("class").split(" ")[1] ||
            $('.speechBubble.selected').attr("class").split(" ")[1] == "Clear") {

                // If the word has an specified year, check if it fits the range
                if(!isNaN(wordsArray[i].features[0].properties.year) && wordsArray[i].features[0].properties.year > 1000){

                    // If the word appeared between the min and max selected years
                    if(wordsArray[i].features[0].properties.year <= selectedMaxYear &&
                        wordsArray[i].features[0].properties.year >= selectedMinYear) {
                            wordsArrayFiltered.push(wordsArray[i]);

                            // Recalculate the counters
                            if(wordsArray[i].features[0].properties.partOfSpeech == "Unbekannt"){unkFound++;}
                            if(wordsArray[i].features[0].properties.partOfSpeech == "Adjektiv"){adjFound++;}
                            if(wordsArray[i].features[0].properties.partOfSpeech == "Substantiv"){susFound++;}
                            if(wordsArray[i].features[0].properties.partOfSpeech == "Adverb"){advFound++;}
                            if(wordsArray[i].features[0].properties.partOfSpeech == "Verb"){verFound++;}
                        }
                    }
                    // If it doesn't have a valid year, check if we want to show it or not
                    else{

                        if (showWordsWithoutYear){
                            wordsArrayFiltered.push(wordsArray[i]);

                            // Recalculate the counters
                            if(wordsArray[i].features[0].properties.partOfSpeech == "Unbekannt"){unkFound++;}
                            if(wordsArray[i].features[0].properties.partOfSpeech == "Adjektiv"){adjFound++;}
                            if(wordsArray[i].features[0].properties.partOfSpeech == "Substantiv"){susFound++;}
                            if(wordsArray[i].features[0].properties.partOfSpeech == "Adverb"){advFound++;}
                            if(wordsArray[i].features[0].properties.partOfSpeech == "Verb"){verFound++;}
                        }
                    }
                }
            }
        }

        // Redraw the counters in HTML
        for(var i=0; i<partsOfSpeechData.length; i++){
            if(partsOfSpeechData[i] == "Unbekannt"){$('.kindCounter.'+partsOfSpeechData[i]).html('('+unkFound+')');}
            else if(partsOfSpeechData[i] == "Adjektiv"){$('.kindCounter.'+partsOfSpeechData[i]).html('('+adjFound+')');}
            else if(partsOfSpeechData[i] == "Adverb"){$('.kindCounter.'+partsOfSpeechData[i]).html('('+advFound+')');}
            else if(partsOfSpeechData[i] == "Substantiv"){$('.kindCounter.'+partsOfSpeechData[i]).html('('+susFound+')');}
            else if(partsOfSpeechData[i] == "Verb"){$('.kindCounter.'+partsOfSpeechData[i]).html('('+verFound+')');}
        }

        // Redraw the map and the points
        drawMap();
    }

    function updateMap() {

        svgWords
        .style("fill",function(d){
            return partOfSpeechColors[String(d.features[0].properties.partOfSpeech)];
        })
        .style("stroke",function(d,i){
            return partOfSpeechColors[String(d.features[0].properties.partOfSpeech)];
        })
        .attr("stroke-width",function(d){
            if(!isNaN(d.features[0].properties.year) && d.features[0].properties.year > 1000){
                return scaleRadius(parseInt(d.features[0].properties.year));
            }
            else return 6;
        });
    }

    function drawMap() {

        svgWords = g.selectAll(".wordPoint")
        .data(wordsArrayFiltered);

        updateMap();

        svgWords.exit()
        .remove();

        svgWords.enter()
        .append("path")
        .attr("d", path)
        .style("fill",function(d){
            return partOfSpeechColors[String(d.features[0].properties.partOfSpeech)];
        })
        .style("stroke",function(d,i){
            return partOfSpeechColors[String(d.features[0].properties.partOfSpeech)];
        })
        .attr("stroke-width",function(d){
            if(!isNaN(d.features[0].properties.year) && d.features[0].properties.year > 1000){
                return scaleRadius(parseInt(d.features[0].properties.year));
            }
            else return 6;
        })
        .attr("class", "wordPoint")
        .on("mouseover", function(d){

            d3.select(this)
            .style("fill",function(d){return "black";})
            .style("stroke",function(d){return "black";})

            info_tooltip.show();
            info_tooltip.html(function(){
                var html = "";
                if(!isNaN(d.features[0].properties.year) && d.features[0].properties.year > 1000){
                    html += "<b>"+d.features[0].properties.word+"</b> ("+parseInt(d.features[0].properties.year)+")";
                }
                else{
                    html += "<b>"+d.features[0].properties.word+"</b>";
                }
                html += "<br>";
                html += "Location: <b>"+d.features[0].properties.locationName+"</b>"
                html += "<br>";
                if(d.features[0].properties.quelleSource == null){
                    html += "Source: <b>Unknown</b>"
                }
                else{
                    html += "Source: <b>"+d.features[0].properties.quelleSource+"</b>"
                }
                return html;
            })
        })
        .on("mouseout", function(){

            d3.select(this)
            .style("fill",function(d){
                return partOfSpeechColors[String(d.features[0].properties.partOfSpeech)];
            })
            .style("stroke",function(d,i){
                return partOfSpeechColors[String(d.features[0].properties.partOfSpeech)];
            })

            info_tooltip.hide();
        });

        zoomed();
    }
