
///// DATA

var fullPersonsArray = new Array();
var filteredPersonsArray = new Array();
var minYear = 9999;
var maxYear = 0;

///// MAP

var width = Math.max(960, window.innerWidth),
height = Math.max(500, window.innerHeight),
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
.scaleExtent([scale, 8 * scale])
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

q.defer(d3.json, "/data/exploreAT.json").await(makeMap);

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

    createPersons();
}

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

// Call for the persons stored in the DB
function createPersons() {

    $.ajax({
        type: "GET",
        url: "http://localhost:3000/api/persons",
        dataType: "json",
        async: true,
        success: function (response) {

            // Create a Feature for each Person
            for(var i=0; i<response.rows.length; i++){

                if(parseInt(response.rows[i].todJahr) < minYear) minYear = parseInt(response.rows[i].todJahr);
                if(parseInt(response.rows[i].todJahr) > maxYear) maxYear = parseInt(response.rows[i].todJahr);

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
                                "vorname": response.rows[i].vorname,
                                "nachname": response.rows[i].nachname,
                                "todJahr": response.rows[i].todJahr
                            }
                        }
                    ]
                }

                fullPersonsArray.push(geoJSONobject);
            }

            drawPersons();
        }
    });
}

var colores = ["#fc8d59", "#ffffbf", "#ffffbf", "#91cf60"];
var heatmapColour = d3.scale.linear()
.domain([-1, -0.1, 0.1, 1])
.range(colores);
var c = d3.scale.linear().domain([1900,2000]).range([-1,-0.1,0.1,1]);

function drawPersons() {

    for(var i=0; i<fullPersonsArray.length; i++){

        g.append("path")
        .datum(fullPersonsArray[i])
        .attr("d", path)
        .attr("fill",function(d){
            return heatmapColour(c(parseInt(d.features[0].properties.todJahr)));
        })
        .attr("stroke",function(d){
            return heatmapColour(c(parseInt(d.features[0].properties.todJahr)));
        })
        .attr("class", "personPoint")
        .append("svg:title")
        .text(function(d,i) {
            return d.features[0].properties.vorname + " " +
            d.features[0].properties.nachname + " (" +
            d.features[0].properties.todJahr + ")" ;
        });
    }
}
