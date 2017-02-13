var lemmas = new Array();
var lemmasFiltered = new Array();
var ladeArray = new Array();
var partOfSpeechArray = new Array();

var partOfSpeechNames = [
  "Unbekannt",
  "Pronom",
  "Adjektiv",
  "Verb",
  "Numerale",
  "Substantiv",
  "Adverb",
  "Präposition",
  "Konjunktion",
  "Interjektion",
  "Präfix/Suffix"
];

var root = {
 "name": "root",
 "type": "root",
 "children": []
};

var originalRoot = root;

var circle;

var ESToken = getCookie("token");

var client = new $.es.Client({
    host: getESHost()
});


createWords();

// Call for the persons stored in the DB
function createWords() {

  var mysql = false;

  if(mysql){
    $.ajax({
        type: "GET",
        url: "api/lemmas",
        dataType: "json",
        async: true,
        success: function (response) {
          dealWithData(response);
        }
    });
  }

  else{
    // client.search({
    //   index: 'dboe-beleg_bedeutung_lemma',
    //   q: 'dbo:ha*'
    // }, function (error, response) {
    //   console.log(response);
    // });


    client.search({
      index: 'dboe-beleg_bedeutung_lemma',
        headers: {
            'Authorization' : "Bearer " + ESToken},
      body: {
        query: {
            bool: {
                must: { match: {"lade": "001121"}}
            }
        },
        function (error, response) {
          console.log(response);
          console.log(error);
        }
      }
    });

    client.search({
      index: 'dboe-beleg_bedeutung_lemma',
        headers: {
            'Authorization' : "Bearer " + ESToken},
      body: {
          // // Begin query.
          // query: {
          //     // Boolean query for matching and excluding items.
          //     bool: {
          //         must: { match: { "katalog": "pflnk" }},
          //     }
          // },
          // Aggregate on the results
          // aggs: {
          //     bedeutung: {
          //         terms: {
          //             field: "bedeutung"
          //         }
          //     }
          // }

          /*
          // Aggregation of lemmas by LADE
          aggs: {
              aggregation: {
                  terms: {
                    field: "lade", "size": 0
                  },
                  aggs: {
                      hits: {
                          top_hits: { size: 2000000 }
                      }
                  }
              }
          }
          */

          // Get all the LADEs
          aggs: {
              aggregation: {
                  terms: {
                    field: "bedeutung", "size": 50
                  }
              }
          }

          // End query.
      }
    }).then(function (resp) {

      var children;

      var buckets = resp.aggregations.aggregation.buckets;

      // LADE buckets
      for(var i=0; i<buckets.length; i++){

        // One children per LADE
        children = {};
        children.name = ""+buckets[i].key;
        children.size = buckets[i].doc_count;
        children.type = "node bedeutung";
        children.children = new Array();

        root.children.push(children);
      }

      client.search({
        index: 'dboe-beleg_bedeutung_lemma',
          headers: {
              'Authorization' : "Bearer " + ESToken},
        body: {
            aggs: { aggregation: { terms: { field: "lade", "size": 10 } } }
        }
      }).then(function (resp2) {

        buckets = resp2.aggregations.aggregation.buckets;

        // LADEs in ROOT
        for(var i=0; i<root.children.length; i++){

          root.children[i].children = new Array();

          // For the selected LADE, we need to add all of its subchildrens (BEDEUTUNGS)
          for(var j=0; j<buckets.length; j++){

            // One children per BEDEUTUNG
            var subChildren = {};
            subChildren.name = buckets[j].key;
            subChildren.size = buckets[j].doc_count;
            subChildren.type = "node lade"
            subChildren.children = new Array(); // This will hold words

            root.children[i].children.push(subChildren);
          }
        }

        console.log(root);

        originalRoot = root;
        generateVisualization();
      });

      console.log(resp);
      // console.log(resp
      //   .aggregations
      //   .aggregation
      //   .buckets[0]
      //   .hits.hits
      //   .hits[0]
      //   ._source
      //   .dbo);
      // D3 code goes here.
    });
  }
}

var contains = function(needle) {
    // Per spec, the way to identify NaN is that it is not equal to itself
    var findNaN = needle !== needle;
    var indexOf;

    if(!findNaN && typeof Array.prototype.indexOf === 'function') {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function(needle) {
            var i = -1, index = -1;

            for(i = 0; i < this.length; i++) {
                var item = this[i];

                if((findNaN && item !== item) || item === needle) {
                    index = i;
                    break;
                }
            }

            return index;
        };
    }

    return indexOf.call(this, needle) > -1;
};

function dealWithData(response){

  // Create a Bubble for each Word
  for(var i=0; i<response.rows.length; i++){

    var lemma = {};
    lemma.id = response.rows[i].id;
    lemma.dbo = response.rows[i].dbo;
    lemma.lade = response.rows[i].lade;
    lemma.pos = partOfSpeechNames[parseInt(response.rows[i].partOfSpeech)-1];

    if(contains.call(ladeArray, lemma.lade) == false){ladeArray.push(lemma.lade);}
    if(contains.call(partOfSpeechArray, lemma.pos) == false){partOfSpeechArray.push(lemma.pos);}

    lemmas.push(lemma);
  }

  lemmasFiltered = lemmas;

  var children;
  var subChildren;

  for(var i=0; i<ladeArray.length; i++){

    // One children per lade
    children = {};
    children.name = "Lade "+ladeArray[i];
    children.children = new Array();

    // Check only words of that lade. If the word is of a given POS, add it as a subChildren
    for(var j=0; j<lemmas.length; j++){
      if(lemmas[j].lade == ladeArray[i]){
        var posObject = {"name":lemmas[j].pos, "size":1, children: []};
        var found = false;
        for(var k=0; k<children.children.length; k++){
          if(children.children[k].name == lemmas[j].pos){
            found = true;
            break;
          }
        }
        if(!found) children.children.push(posObject);
      }
    }

    // // Check words of that lade, that share each POS to include them as subSubChildrens
    // for(var k=0; k<children.children.length; k++){
    //   for(var m=0; m<lemmas.length; m++){
    //     if(lemmas[m].lade == ladeArray[i]){
    //       if(lemmas[m].pos == children.children[k].name){
    //         var lemmaObject = {"name":lemmas[m].dbo, "size":1};
    //         children.children[k].children.push(lemmaObject);
    //       }
    //     }
    //   }
    // }

    root.children.push(children);
  }

  // var children = {};
  // children.name = "Child 1";
  // children.children = [];
  // var subChildren = {};
  // subChildren.name = "SubChild 1";
  // subChildren.size = 2;
  // children.children.push(subChildren);
  // subChildren.name = "SubChild 2";
  // subChildren.size = 4;
  // children.children.push(subChildren);
  // root.children.push(children);
  //
  // children = {};
  // children.name = "Child 2";
  // children.children = [];
  // subChildren = {};
  // subChildren.name = "SubChild 3";
  // subChildren.size = 6;
  // children.children.push(subChildren);
  // subChildren.name = "SubChild 4";
  // subChildren.size = 8;
  // children.children.push(subChildren);
  // root.children.push(children);

  console.log(root);

  setupFilters();
  generateVisualization();
}

function setupFilters(){

    // WORD FILTER

    $('#searchField').keyup(function(){
      handleFilters();
    });
}

function handleFilters(){

  root = originalRoot;
  regenerateVisualization();
}

function clearVisualization() {

  $('#chart').html('');

  svg = d3.select("#chart").append("svg")
      .attr("width", diameter)
      .attr("height", diameter)
      .append("g")
      .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");
}

function generateVisualization() {

  var focus = root,
      nodes = pack.nodes(root),
      view;

  circle = svg.selectAll("circle")
      .data(nodes);

  circle
    .attr("class", function(d) {
      return d.type;
    })
    .style("fill", function(d) { return d.children ? color(d.depth) : null; });

  circle.exit()
    .remove();

  circle.enter()
    .append("circle")
    .attr("class", function(d) {
      return d.type;
    })
    .style("fill", function(d) { return d.children ? color(d.depth) : null; })
    .on("click", function(d) { if (focus !== d) zoom(d), d3.event.stopPropagation(); });

  var text = svg.selectAll("text")
      .data(nodes)
    .enter().append("text")
      .attr("class", function(d){
        return "label "+d.type.replace("node ","");
      })
      .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
      //.style("display", function(d) { return d.parent === root ? "inline" : "none"; })
      .text(function(d) { return d.name; });

  var node = svg.selectAll("circle,text");

  d3.select("#chart")
      .style("background", color(-1))
      .on("click", function() { zoom(root); });

  d3.select("#resetZoomButton")
      .on("click", function() { zoom(root); });

  zoomTo([root.x, root.y, root.r * 2 + margin]);

  function zoom(d) {
    var focus0 = focus; focus = d;

    console.log("zoom 1 activated");
    console.log(d.name);

    // If we go to the root node, we clear the visualization
    if(d.name == "root"){
      root = originalRoot;
    }
    else {
      console.log("updating viz");
    }

    var transition = d3.transition()
        // .duration(d3.event.altKey ? 7500 : 750)
        .duration(750)
        .tween("zoom", function(d) {
          var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
          return function(t) { zoomTo(i(t)); };
        });

    transition.selectAll("text")
      .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
        .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
        .each("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
        .each("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
  }

  function zoomTo(v) {
    var k = diameter / v[2]; view = v;
    node.attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
    circle.attr("r", function(d) { return d.r * k; });
  }
}




function updateCircles(){

  circle
  .attr("class", function(d) {
    return d.type;
  })
  .style("fill", function(d) { return d.children ? color(d.depth) : null; });
}

function updateVisualization(focus){

  var nodes = pack.nodes(root),
      view;

  circle = svg.selectAll("circle")
    .data(nodes);

  updateCircles();

  circle.exit()
    .remove();

  circle.enter()
    .append("circle")
    .attr("class", function(d) {
      return d.type;
    })
    .style("fill", function(d) { return d.children ? color(d.depth) : null; })
}

var margin = 20,
    diameter = 500;

var color = d3.scale.linear()
    .domain([-1, 5])
    .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
    .interpolate(d3.interpolateHcl);

var pack = d3.layout.pack()
    .padding(2)
    .size([diameter - margin, diameter - margin])
    .value(function(d) { return d.size; })

var svg = d3.select("#chart").append("svg")
    .attr("width", diameter)
    .attr("height", diameter)
    .append("g")
    .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

d3.select(self.frameElement).style("height", diameter + "px");
