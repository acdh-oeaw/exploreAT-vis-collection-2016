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

var the_id = 346;
var refreshIntervalId;

var q = d3_queue.queue();

q
.defer(d3.json, "/data/exploreAT.json")
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

    drawPersons();
}

// Call for the persons stored in the DB
function drawPersons() {

    $.ajax({
        type: "GET",
        url: "http://localhost:3000/api/colorLemma",
        dataType: "json",
        async: true,
        success: function (response) {

            return;

            // Create a new Wicket instance
            var wkt = new Wkt.Wkt();
            wkt.read(response.rows[0].geometry);

            var geoJSON = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": wkt.toJson().type,
                            "coordinates": wkt.toJson().coordinates
                        },
                        "properties": {
                            "id": response[0],
                            "name": response[2]
                        }
                    }
                ]
            }

            newTarget(null, geoJSON);
        }
    });
}

// Manage json path and draw the region extracted from MySQL
function newTarget(error, target) {

    // svg.selectAll(".place.TARGET").remove();
    // svg.selectAll(".place-label.TARGET").remove();

    g.append("path")
    .datum(target)
    .attr("d", path)
    .attr("class", "place TARGET REGION");

    g.append("text")
    .data([target])
    .attr("class", "place-label TARGET REGION")
    .attr("transform", function (d) {
        return "translate(" + path.centroid(d) + ")";
    })
    .attr("x", function (d) {
        return d.features[0].geometry.coordinates[0] > -1 ? 6 : -6;
    })
    .attr("dy", ".35em")
    .style("text-anchor", function (d) {
        return d.features[0].geometry.coordinates[0] > -1 ? "start" : "end";
    })
    .text(function (d) {
        console.log(d.features[0].properties.name);
        return d.features[0].properties.name;
    })
    .on("mouseover", function(){return;})
    .on("mouseout", function(){return;});
}
