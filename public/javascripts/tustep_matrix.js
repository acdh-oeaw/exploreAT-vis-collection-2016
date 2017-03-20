var esClient = new $.es.Client({
    hosts: "http:\/\/localhost:9200\/"
});

var tip = d3.tip()
.attr('class', 'd3-tip');

var color10, color100, color5000;

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
    console.log("asdf");
    console.log(resp);

    var letters = genCharArray('a', 'z');

    var nodes = [];

    letters.forEach(function(letter, idx) {
        nodes.push({"name": letter, "group": idx});
    });

    var links = [];

    var regexp = new RegExp("[a-z]");
    var maxCount = 0;
    var counts = [];
    resp.aggregations.words_firstLetter.buckets.forEach(function(bucket) {
        var letter = bucket.key;
        bucket.words_secondLetter.buckets.forEach(function(secondBucket) {
            var secondLetter = secondBucket.key;
            if (regexp.test(secondLetter)) {
                var count = secondBucket.doc_count;
                if (count > maxCount) maxCount = count;
                counts.push(count);
                links.push({
                    "source": letters.indexOf(letter),
                    "target": letters.indexOf(secondLetter),
                    "count": count
                });
            }
        });
    });

    counts.sort(function(a,b) {
        return a - b;
    });

    color10 = d3.scale.threshold().
    domain([12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]).
    range(['#002BE5','#0729DC','#0E28D3','#1626CA','#1D25C1','#2423B8','#2C22B0','#3321A7','#3A1F9E']);

    color100 = d3.scale.threshold().
    domain([200, 325, 450, 575, 700, 825, 950, 1075]).
    range(['#421E95','#491C8C','#501B84','#58197B','#5F1872','#661769','#6E1560','#751458','#7C124F']);

    color5000 = d3.scale.threshold()
    .domain([1200, 1350, 1500, 1750, 2000, 3000, 4000, 5000])
    .range(['#841146','#8B0F3D','#920E34','#9A0D2C','#A10B23','#A80A1A','#B00811','#B70708','#BF0600']);

    var data = {"nodes" : nodes, "links" : links};

    createAdjacencyMatrix(data);

});

function colorForValue(value) {
    if (value < 200) {
        return color10(value);
    } else if (value >= 200 && value < 1200) {
        return color100(value);
    } else return color5000(value);
}


function createAdjacencyMatrix(data) {

    var adjacencyMatrix = d3.layout.adjacencyMatrix()
    .size([600,600])
    .nodes(data.nodes)
    .links(data.links)
    .directed(true)
    .nodeID(function (d) {
        return d.name
    })
    .edgeWeight(function(d) {
        console.log(d.count);
        return d.count;
    });

    var matrixData = adjacencyMatrix();

    svg = d3.select("svg");
    svg.call(tip);

    svg.append("g")
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
        return colorForValue(d.weight);
    })
    .style("fill-opacity",1)
    .on("mouseover", tipTextAT)
    .on("mouseout", mouseout);

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

function tipTextAT(d) {

    tip.html("<strong style='color:SteelBlue'>" + d.id.replace('-', '') + "<br></strong><span>" + d.weight + " words</span>");
    tip.show();
}

function mouseout() {
    tip.hide();
}
