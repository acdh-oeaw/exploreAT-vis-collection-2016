var width = 1200,
    height = 650;

var projection = d3.geo.stereographic()
    .center([15.0972,47.3817])
    .scale(15000)
    .translate([width / 2 , height / 2]);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);


var color = d3.scale.linear().domain([0,5]).range(['blue', 'red']);

/*  http://0.0.0.0:5001/region?target=888
*/


d3.json("./regions/regions.json", function(error, europe) {
  svg.selectAll(".region")
  .data(topojson.feature(europe, europe.objects.regions).features)
  .enter()
    .append("path")
    .filter(function(d) { return d.properties.NUTS_ID.indexOf("AT") > -1; })
      .attr("class", "region")
      .attr("d", path)
      .style("stroke", "#333")
      .style("stroke-width", 0.6)
      .style("fill", function(d) {
          return color(100*d.properties.POPULATION/8389800);
         })
      .call(d3.helper.tooltip(function(d, i){return tooltipText(d);}));


    function tooltipText(d){

           return d.properties.NUTS_ID + "<br><b>" + d.properties.NAME + "</b>"
                  + "<br/> pop: " + d.properties.POPULATION;
      }
});

d3.json("/region?target=888", function(error, data) {
  data;
});
