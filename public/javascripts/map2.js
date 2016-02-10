var width = 1660,
    height = 980;

var projection = d3.geo.stereographic()
    .center([15.0972, 47.3817])
    .scale(1200 * 18)
    .translate([width * 3 / 4, height / 2]);

/*d3.geo.albers()
    .center([0, 55.4])
    .rotate([4.4, 0])
    .parallels([50, 60])
    .scale(1200 * 5)
    .translate([width / 2, height / 2]);
*/
var path = d3.geo.path()
    .projection(projection)
    .pointRadius(2);

var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);


d3.json("./data/exploreAT.json", function (error, exploreAT) {
    var subunits = topojson.feature(exploreAT, exploreAT.objects.subunits),
        places = topojson.feature(exploreAT, exploreAT.objects.places2);

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
        .attr("class", "place");

    svg.selectAll(".place-label")
        .data(places.features)
        .enter().append("text")
        .attr("class", "place-label")
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
        .on("mouseover", mouseover);

    function mouseover() {
        alert("Pulso sobre: " + d.properties.name);
    }
});