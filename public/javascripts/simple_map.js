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

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0]);

var the_id = 346;
var refreshIntervalId;

var q =  d3_queue.queue();

q
    .defer(d3.json, "/data/exploreAT.json")
    .defer(d3.json, "/data/places_out.json")
    .await(makeMap);

function makeMap(error, exploreAT, places_out, target) {

    var subunits = topojson.feature(exploreAT, exploreAT.objects.subunits);
    var places = topojson.feature(exploreAT, exploreAT.objects.places);

    //target = {"coordinates": [[[[3.78, 9.28], [-130.91, 1.52], [35.12, 72.234], [3.78, 9.28]]], [[[23.18, -34.29], [-1.31, -4.61], [3.41, 77.91], [23.18, -34.29]]]], "type": "MultiPolygon"};

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
        //.on("mouseover", mouseover(d))
        .on("mouseover", tipTextAT)
        .on("mouseout", mouseout);


    g.append("path")
        .datum(places_out)
        .attr("d", path)
        .attr("class", "place OUT");

    g.selectAll(".place-label OUT")
        .data(places_out.features)
        .enter().append("text")
        .attr("class", "place-label OUT")
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
            return d.properties.NAME;
        })
        .on("mouseover", tipText)
        .on("mouseout", mouseout);

    g.call(tip);

    //    for(var i=0; i<500; i++){
    //        update(the_id++);
    //    }
    refreshIntervalId = setInterval(function () {
        updateMapWithRegionWithID(the_id++);
    }, 30);
}

// Call for region by ID (MySQL connection) and retrieve json
function updateMapWithRegionWithID(id) {

    //if (id > 0 && id < 2588) {
    if (id > 0 && id < 350) {
        $.ajax({
            type: "GET",
            url: "http://localhost:3000/region/" + id,
            dataType: "json",
            async: true,
            success: function (response) {

                /*
                var object = new Object;
                object.id = response[0];
                object.geometry = response[1];
                object.name = response[2];
                object.level = response[3];
                object.quelle = response[4];
                */

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
    } else {
        clearInterval(refreshIntervalId);
    }
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
        .on("mouseover", tipTextAT)
        .on("mouseout", mouseout);
}


// Tooltip filler
function tipTextAT(d) {

    tip.html("<strong style='color:SteelBlue'>Name: </strong><span>" + d.properties.name + "</span>");
    tip.show();
}

// Tooltip filler
function tipText(d) {

    tip.html(d.properties.SOV0NAME + "<br><strong style='color:SteelBlue'>Name: </strong><span>" + d.properties.NAME + "</span> (" + d.properties.ADM1NAME + ")<br/><strong style='color:SteelBlue'> pop: </strong><span>" + d.properties.POP_MAX + "</span>");
    tip.show();
}

// Tooltip hide method
function mouseout() {
    tip.hide();
}