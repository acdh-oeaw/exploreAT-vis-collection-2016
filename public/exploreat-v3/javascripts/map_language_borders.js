var width = 1260,
height = 980;

var projection = d3.geo.mercator()
.center([15.0972, 47.3817])
.scale(1200 * 6)
.translate([width * 3 / 4, height / 2]);

var path = d3.geo.path()
.projection(projection)
.pointRadius(2);

var svg = d3.select("#map").append("svg")
.attr("width", width)
.attr("height", height);




var tip = d3.tip()
.attr('class', 'd3-tip')
.offset([-10, 0]);

function colors_google(n) {
    var colors_g = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
    return colors_g[n % colors_g.length];
}

var the_id = 1;
var refreshIntervalId;

queue()
.defer(d3.json, "./data/exploreAT.json")
.defer(d3.json, "./data/places_out.json")
.await(makeMap);

function makeMap(error, exploreAT, places_out, target) {
    var subunits = topojson.feature(exploreAT, exploreAT.objects.subunits),
    places = topojson.feature(exploreAT, exploreAT.objects.places);
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
    if (id > 0 && id < 9) {
        queue()
        .defer(d3.json, "/language_borders?target=" + id)
        .await(newTarget);
    } else {
        clearInterval(refreshIntervalId);
    }
}

function newTarget(error, target) {

    svg.append("path")
    .datum(target)
    .attr("d", path)
    .attr("class", "place BORDER")
    .style("fill", "none")
    .style("stroke-width", "3px")
    .style("stroke", function (d, i) {
        return colors_google(d.properties.gid);
    });

    svg.data([target])
    .append("text")
    .attr("class", "place-label BORDER")
    .attr("transform", function (d) {
        return "translate(" + path.centroid(d) + ")";
    })
    .attr("x", function (d) {
        return path.centroid(d)[0] > -1 ? 6 : -6;
    })
    .attr("dy", ".35em")
    .style("text-anchor", function (d) {
        return path.centroid(d)[0] > -1 ? "start" : "end";
    })
    .text(function (d) {
        return d.properties.name;
    })
    .style("stroke", function (d, i) {
        return colors_google(d.properties.gid);
    })
    .on("mouseover", tipTextAT)
    .on("mouseout", mouseout);
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
