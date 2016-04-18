// var ip = 'http:\/\/'+'exploreat.usal.es';
// var esClient = new $.es.Client({
//     hosts: ip+"/elasticsearch"
// });

var esClient = new $.es.Client({
  hosts: "http:\/\/localhost:9200\/"
});

var color;

esClient.search({
  index: 'tustep',
  body: {
    "size": 0,
    "query": {
      "filtered": {
        "filter": {
          "regexp": {
            "mainLemma.raw": "[a-z].*"
          }
        }
      }
    },
    "aggs": {
      "words_firstLetter": {
        "terms": {
          "field": "mainLemma.raw",
          "script": "_value.charAt(0)",
          "size": 0
        },
        "aggs": {
          "words_secondLetter": {
            "terms": {
              "field": "mainLemma.raw",
              "script": "_value.charAt(1)",
              "size": 0
            }
          }
        }
      }
    }
  }
}).then(function (resp) {
  console.log(resp);

  var letters = genCharArray('a', 'z');

  var nodes = [];

  letters.forEach(function(letter, idx) {
    nodes.push({"name": letter, "group": idx});
  });

  var links = [];

  var regexp = new RegExp("[a-z]");
  var maxCount = 0;
  resp.aggregations.words_firstLetter.buckets.forEach(function(bucket) {
    var letter = bucket.key;
    bucket.words_secondLetter.buckets.forEach(function(secondBucket) {
      var secondLetter = secondBucket.key;

      if (regexp.test(secondLetter)) {
        var count = secondBucket.doc_count;
        if (count > maxCount) maxCount = count;

        links.push({
          "source": letters.indexOf(letter),
          "target": letters.indexOf(secondLetter),
          "count": count
        });
      }
    });
  });

  color = d3.scale.linear()
      .domain([0, 5000])
      .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
      .interpolate(d3.interpolateHcl);

  var data = {"nodes" : nodes, "links" : links};

  createAdjacencyMatrix(data);

});


function createAdjacencyMatrix(data) {

  var adjacencyMatrix = d3.layout.adjacencyMatrix()
      .size([800,800])
      .nodes(data.nodes)
      .links(data.links)
      .directed(false)
      .nodeID(function (d) {
        return d.name
      })
      .edgeWeight(function(d) {
        console.log(d.count);
        return d.count;
      }).directed(false);

  var matrixData = adjacencyMatrix();

  // console.log(matrixData)


  d3.select("svg")
      .append("g")
      .attr("transform", "translate(50,50)")
      .attr("id", "adjacencyG")
      .selectAll("rect")
      .data(matrixData)
      .enter()
      .append("rect")
      .attr("width", function (d) {return d.width})
      .attr("height", function (d) {return d.height})
      .attr("x", function (d) {return d.x})
      .attr("y", function (d) {return d.y})
      .style("stroke", "black")
      .style("stroke-width", "1px")
      .style("stroke-opacity", .1)
      .style("fill", function (d) {
        return color(d.weight)
      })
      .style("fill-opacity",1);

  d3.select("#adjacencyG")
      .call(adjacencyMatrix.xAxis);

  d3.select("#adjacencyG")
      .call(adjacencyMatrix.yAxis);

}



function genCharArray(charA, charZ) {
  var a = [], i = charA.charCodeAt(0), j = charZ.charCodeAt(0);
  for (; i <= j; ++i) {
    a.push(String.fromCharCode(i));
  }
  return a;
}
