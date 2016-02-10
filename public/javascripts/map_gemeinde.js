var width = 1260,
    height = 980;

var projection = d3.geo.stereographic()
    .center([15.0972, 47.3817])
    .scale(1200 * 18)
    .translate([width * 3 / 4, height / 2]);

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




var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0]);
var the_id = 1;
var refreshIntervalId;

queue()
    .defer(d3.json, "./data/exploreAT.json")
    .defer(d3.json, "./data/places_out.json")
    .await(makeMap);

function makeMap(error, exploreAT, places_out, target) {
    var subunits = topojson.feature(exploreAT, exploreAT.objects.subunits),
        places = topojson.feature(exploreAT, exploreAT.objects.places);
    //target = {"coordinates": [[[[3.78, 9.28], [-130.91, 1.52], [35.12, 72.234], [3.78, 9.28]]], [[[23.18, -34.29], [-1.31, -4.61], [3.41, 77.91], [23.18, -34.29]]]], "type": "MultiPolygon"};
    svg.selectAll(".subunit")
        .data(subunits.features)
        .enter().append("path")
        .attr("class", function (d) {
            return "subunit " + d.id;
        })
        .attr("d", path);

    svg.append("path")
        .datum(topojson.mesh(exploreAT, exploreAT.objects.subunits, function (a, b) {
            return a !== b && a.id !== "DEU";
        }))
        .attr("d", path)
        .attr("class", "subunit-boundary");

    svg.append("path")
        .datum(topojson.mesh(exploreAT, exploreAT.objects.subunits, function (a, b) {
            return a === b && a.id === "AUT";
        }))
        .attr("d", path)
        .attr("class", "subunit-boundary AUT");

    svg.selectAll(".subunit-label")
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

    svg.append("path")
        .datum(places)
        .attr("d", path)
        .attr("class", "place AT");

    svg.selectAll(".place-label AT")
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


    svg.append("path")
        .datum(places_out)
        .attr("d", path)
        .attr("class", "place OUT");

    svg.selectAll(".place-label OUT")
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





    svg.call(tip);

    refreshIntervalId = setInterval(function () {
        update(the_id++);
    }, 30);

}

function update(id) {
    if (id > 0 && id < 2588) {
        queue()
            .defer(d3.json, "/gemeinde?target=" + id)
            .await(newTarget);
    } else {
        clearInterval(refreshIntervalId);
    }
}

function newTarget(error, target) {
    // svg.selectAll(".place.TARGET").remove();
    // svg.selectAll(".place-label.TARGET").remove();

    svg.append("path")
        .datum(target)
        .attr("d", path)
        .attr("class", "place TARGET");

    /*  svg.selectAll(".place-label.TARGET")
      .data([target])
    .enter().append("text")
      .attr("class", "place-label TARGET")
      .attr("transform", function(d) { return "translate(" + path.centroid(d)  + ")"; })
      .attr("x", function(d) {return d.geometry.coordinates[0] > -1 ? 6 : -6;})
      .attr("dy", ".35em")
      .style("text-anchor", function(d) { return d.geometry.coordinates[0] > -1 ? "start" : "end"; })
      .text(function(d) {
      return d.properties.name;
      })
      .on("mouseover", tipTextAT)
      .on("mouseout", mouseout);
*/
}

function tipTextAT(d) {

    tip.html("<strong style='color:SteelBlue'>Name: </strong><span>" + d.properties.name + "</span>");
    tip.show();
}

function tipText(d) {

    tip.html(d.properties.SOV0NAME + "<br><strong style='color:SteelBlue'>Name: </strong><span>" + d.properties.NAME + "</span> (" + d.properties.ADM1NAME + ")<br/><strong style='color:SteelBlue'> pop: </strong><span>" + d.properties.POP_MAX + "</span>");
    tip.show();
}

function mouseout() {
    tip.hide();
}