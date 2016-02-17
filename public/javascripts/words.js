
///// DATA

var wordsArray = new Array();
var wordsArrayFiltered = new Array();
var minYear = 9999;
var maxYear = 0;
var partsOfSpeechData = new Array();

// HELPERS

var scaleRadius;
var heatmapColors;
var heatmapScale;
var c;
var partOfSpeechColors;

var info_tooltip = $('#info-tooltip');

///// MAP

var width = Math.max(960, window.innerWidth),
    height = Math.max(500, window.innerHeight),
    scale = 4000;

var projection = d3.geo.stereographic()
    .center([15.0972, 47.3817])
    .scale(scale)
    .translate([width / 2, height / 2]);

/*d3.geo.albers()
    .center([8.0972,47.3817])
    .rotate([-6.4, 0])
    .parallels([51, 53])
    .scale(1200 * 8)
    .translate([width / 2, height / 2]);
*/

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
    .scaleExtent([scale, 12 * scale])
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

q.defer(d3.json, "/data/exploreAT.json")
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


    // Map loaded. Now start working
    createWords();

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
function createWords() {

  $.ajax({
      type: "GET",
      url: "http://localhost:3000/api/words",
      dataType: "json",
      async: true,
      success: function (response) {

        // Create a Feature for each Word
        for(var i=0; i<response.rows.length; i++){

          if(parseInt(response.rows[i].year) < minYear) minYear = parseInt(response.rows[i].year);
          if(parseInt(response.rows[i].year) > maxYear) maxYear = parseInt(response.rows[i].year);

          if((partsOfSpeechData.indexOf(response.rows[i].partOfSpeech) > -1) == false){
              partsOfSpeechData.push(response.rows[i].partOfSpeech);
          }

          // Create a new Wicket instance
          var wkt = new Wkt.Wkt();
          wkt.read(response.rows[i].geometry);

          var coordinatesJitter = wkt.toJson().coordinates;
          coordinatesJitter[0] = coordinatesJitter[0] + getRandom(-0.02,0.02);
          coordinatesJitter[1] = coordinatesJitter[1] + getRandom(-0.02,0.02);

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
        drawWords();
      }
  });
}

function setupHTML() {

  // FIELD FILTER

  $('#clearFieldButton').on("click", function(){
    $('#searchField').val("");
    wordsArrayFiltered = wordsArray;
    updateMap();
  });

  $('#searchFieldButton').on("click", function(){

    wordsArrayFiltered = new Array();

    if($('#searchField').val() == ""){
      wordsArrayFiltered = wordsArray;
    }
    else {
      for(var i=0; i<wordsArray.length; i++){
        if(wordsArray[i].features[0].properties.word.toLowerCase().indexOf($('#searchField').val().toLowerCase()) > -1) {
          wordsArrayFiltered.push(wordsArray[i]);
        }
      }
    }

    updateMap();
  });

  // SPEECH FILTER

  for(var i=0; i<partsOfSpeechData.length; i++){
    $('#speechFilter').append(function(){
      var html = '';
      html += '<div class="speechOptionBar">';
      html += '<div class="speechBubble '+partsOfSpeechData[i]+'"></div>'+partsOfSpeechData[i];
      html += '</div>';
      return html;
    })

    $('.speechBubble.'+partsOfSpeechData[i]).on("click", function(){
      wordsArrayFiltered = new Array();
      for(var j=0; j<wordsArray.length; j++){
        if(wordsArray[j].features[0].properties.partOfSpeech == this.getAttribute("class").split(" ")[1]) {
          wordsArrayFiltered.push(wordsArray[j]);
        }
      }
      updateMap();
    });
  }

  // Clear Speech Filter option
  $('#speechFilter').append(function(){
    var html = '';
    html += '<div class="speechOptionBar">';
    html += '<div class="speechBubble Clear"></div>All';
    html += '</div>';
    return html;
  })

  // Clear Speech Filter Listener
  $('.speechBubble.Clear').on("click", function(){
    wordsArrayFiltered = wordsArray;
    updateMap();
  });

}

function drawWords() {

    scaleRadius = d3.scale.linear()
    .domain([minYear, maxYear])
    .range([1,8]);

    heatmapColors = ["#d7191c", "#ffffbf", "#1a9641"];
    heatmapScale = d3.scale.linear()
      .domain([-1,0,1])
      .range(heatmapColors);
    c = d3.scale.linear().domain([minYear,maxYear]).range([-1,0,1]);

    partOfSpeechColors = {
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

    wordsArrayFiltered = wordsArray;

    updateMap();
}

function updateMap() {

    var svgWords = g.selectAll(".wordPoint")
    .data(wordsArrayFiltered);

    svgWords.exit()
      .remove();

    svgWords.enter()
    .append("path")
    .attr("d", path)
    .attr("fill",function(d){
      return partOfSpeechColors[d.features[0].properties.partOfSpeech];
    })
    .attr("stroke",function(d){
      return partOfSpeechColors[d.features[0].properties.partOfSpeech];
    })
    .attr("stroke-width",function(d){
      return scaleRadius(parseInt(d.features[0].properties.year));
    })
    .attr("class", "wordPoint")
    .on("mouseover", function(d){
      info_tooltip.show();
      info_tooltip.html(function(){
        var html = "";
        html += "<b>"+d.features[0].properties.word+"</b> ("+parseInt(d.features[0].properties.year)+")";
        html += "<br>";
        html += "Location: <b>"+d.features[0].properties.locationName+"</b>"
        html += "<br>";
        html += "Part of Speech: <b>"+d.features[0].properties.partOfSpeech+"</b>"
        return html;
      })
    })
    .on("mouseout", function(){
      info_tooltip.hide();
    })
    .append("svg:title")
    .text(function(d,i) {
      return d.features[0].properties.word + " (" +
      d.features[0].properties.year + ")" ;
    });

}
