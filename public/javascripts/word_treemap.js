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

var miRoot;

var originalRoot = root;

var circle;

var ip = 'http:\/\/'+'172.20.1.95';
var client = new $.es.Client({
  hosts: ip+":9200"
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
      body: {
        query: {
            bool: {
                must: { match: {"lade": "001121"}},
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
                    field: "lade", "size": 200
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
        children.type = "node bedeutung"
        children.children = new Array();

        root.children.push(children);
      }

      client.search({
        index: 'dboe-beleg_bedeutung_lemma',
        body: {
            aggs: { aggregation: { terms: { field: "belegjahr", "size": 100 } } }
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
            // subChildren.children = new Array(); // This will hold words

            root.children[i].children.push(subChildren);
          }
        }

        console.log(root);

        miRoot = root;
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




//////
///////





function generateVisualization() {

        var datigovitTreemap = function(){

        // Main data structure
        var data;

        // Find container element and extract dataset name
        var treemapCssContainer = '#chart';
        var treemapFilename = "";
        var datasetName = "";

        // Create <svg> and resize it
        var selection = d3.select( treemapCssContainer ).text('');
        selection = selection.append('svg').style('width', '100%').style('height', '300px');

        var width = parseInt( selection.style('width'), 10 );
        var height = parseInt( selection.style('height'), 10 );

        data = miRoot;
        initTreemap();

        function initTreemap() {


            var marginTop = 30;
            height = height - marginTop;
            var formatNumber = d3.format(',d');
            var transitioning;

            var x = d3.scale.linear()
                    .domain([0, width])
                    .range([0, width]);

            var y = d3.scale.linear()
                    .domain([0, height])
                    .range([0, height]);

            selection.attr('width', width)
                    .attr('height', marginTop + height)
                    .style('background', '#ddd')
                    .append('g')
                        .style('shape-rendering', 'crispEdges');

            var grandparent = selection.append('g')
                    .attr('class', 'grandparent');

            grandparent.append('rect')
                    .attr('width', width)
                    .attr('height', marginTop)
                    .attr('fill', '#13a694')
                    .style('cursor', 'pointer')
                    .on('mouseout', function(){
                        d3.select(this).attr('fill', '#13a694');
                    })
                    .on('mouseover', function(){
                        d3.select(this).attr('fill', '#029583');
                    });

            grandparent.append('text')
                    .attr('dy', '.75em')
                    .style('font-weight', 'bold')
                    .style('font-size', '1.2em')
                    .style('fill', 'white')
                    .call(text);

            var treemap = d3.layout.treemap()
                .children(function(d, depth) {
                    return depth ? null : d._children;
                })
                .value(countDescendance)
                .sort(function(a, b) {
                    return a.value - b.value;
                })
                .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
                .round(false);

            var root = data;
            initialize(root);
            accumulate(root);
            layout(root);
            var g0 = display(root);
            refreshLabels(g0, root);

            function initialize(root) {
                root.x = root.y = 0;
                root.dx = width;
                root.dy = height;
                root.depth = 0;
            }

            // Aggregate the values for internal nodes. This is normally done by the
            // treemap layout, but not here because of our custom implementation.
            // We also take a snapshot of the original children (_children) to avoid
            // the children being overwritten when when layout is computed.
            function accumulate(d) {
                return (d._children = d.children)
                        ? d.size = d.children.reduce(function(p, v) {
                            return p + accumulate(v);
                        }, 0)
                        : d.size;
            }

            // Compute the treemap layout recursively such that each group of siblings
            // uses the same size (1×1) rather than the dimensions of the parent cell.
            // This optimizes the layout for the current zoom state. Note that a wrapper
            // object is created for the parent node for each group of siblings so that
            // the parent’s dimensions are not discarded as we recurse. Since each group
            // of sibling was laid out in 1×1, we must rescale to fit using absolute
            // coordinates. This lets us use a viewport to zoom.
            function layout(d) {
                if (d._children) {
                    treemap.nodes({_children: d._children});
                    d._children.forEach(function(c) {
                        c.x = d.x + c.x * d.dx;
                        c.y = d.y + c.y * d.dy;
                        c.dx *= d.dx;
                        c.dy *= d.dy;
                        c.parent = d;
                        layout(c);
                    });
                }
            }

            function countDescendance(d){
                if(d._children) {
                    var sons = 0;
                    d._children.forEach( function(c){
                        sons += countDescendance(c);
                    });
                    return sons;
                } else {
                    return 1;
                }
            }

            function display(d) {
                grandparent
                        .datum(d.parent)
                        .on('click', transition)
                        .select('text')
                        .text(name(d));

                var g1 = selection.insert('g', '.grandparent')
                        .datum(d)
                        .attr("class", "depth")
                        .attr('transform', 'translate(0,' + marginTop + ')');

                var g = g1.selectAll('g')
                        .data(d._children)
                        .enter().append('g');

                g.filter(function(d) {
                            return d._children;
                        })
                        .classed('children', true)
                        .on('click', transition);

                g.selectAll('.child')
                        .data(function(d) {
                            return d._children || [d];
                        })
                        .enter().append('rect')
                        .attr('class', 'child')
                        .call(rect)
                        .style('fill', getColor);

                g.append('rect')
                        .attr('class', 'parent')
                        .call(rect)
                        .style('cursor', leafPointer)
                        .style('fill-opacity', '0.5')
                        .style('fill', getColor)
                        .style('stroke-width', '2px')
                        .on('mouseout', function(){
                            d3.select(this).style('fill-opacity', '0.5');
                        })
                        .on('mouseover', function(){
                            d3.select(this).style('fill-opacity', '0.8');
                        })
                        .on('click', leafClicked)
                        .append('title')
                        .text(function(d) {
                            return d.name;
                        });


                // Animation
                function transition(d) {
                    if (transitioning || !d)
                        return;

                    transitioning = true;

                    var duration = 750;

                    var g2 = display(d);
                    var t1 = g1.transition().duration(duration);
                    var t2 = g2.transition().duration(duration);

                    // Update the domain only after entering new elements.
                    x.domain([d.x, d.x + d.dx]);
                    y.domain([d.y, d.y + d.dy]);

                    // Enable anti-aliasing during the transition.
                    selection.style('shape-rendering', null);

                    // Draw child nodes on top of parent nodes.
                    selection.selectAll('.depth').sort(function(a, b) {
                        return a.depth - b.depth;
                    });

                    // Fade-in entering text.
                    g2.selectAll('text').style('fill-opacity', 0);

                    // Transition to the new view.
                    t1.selectAll('text').call(text).style('fill-opacity', 0);
                    t2.selectAll('text').call(text).style('fill-opacity', 1);
                    t1.selectAll('rect').call(rect);
                    t2.selectAll('rect').call(rect);

                    // Remove the old node when the transition is finished.
                    t1.remove().each('end', function() {
                        refreshLabels(g2, d);
                        selection.style('shape-rendering', 'crispEdges');
                        transitioning = false;
                    });

                }

                return g;
            }

            function leafClicked(d) {
                // Click on final leaf
                if( d.info && d.info.Url && !d._children ) {
                    window.location = d.info.Url;
                }
            }

            function leafPointer(d) {
                if( !d || !d.info || (d.info.Url || d._children ) ) {
                    return 'pointer';
                }

                return 'default';
            }

            function getColor(d){
                if( d.info && d.info.color /* && !d._children */) {
                    return d.info.color;
                }
                return '#bbb';
            }

            function refreshLabels(g2, d) {

                g2.append('text')
                        .classed('treemap-box-label', true)
                        .attr('dy', '.75em')
                        .text(function(d) {
                            return d.name + ' (' + formatNumber(d.value) + ')';
                        })
                        .attr('font-size', function(d){

                            var containerWidth = d3.select(this.parentNode).select('.parent').attr('width');
                            var containerHeight = d3.select(this.parentNode).select('.parent').attr('height');

                            //var containerWidth = d3.select(this.parentNode).data()[0].dx;
                            //var containerHeight = d3.select(this.parentNode).data()[0].dy;

                            var containerAvg = Math.sqrt(containerWidth * containerHeight);

                            var fontSize = 0.7 * containerAvg/ Math.sqrt(d.name.length);

                            if(fontSize < 6){
                                fontSize = 0;
                            }
                            if(fontSize > 30) {
                                fontSize = 30;
                            }

                            return fontSize;
                        })
                        .call(text)
                        .on('click', leafClicked)
                        .on('mouseout', function(){
                            if(!transitioning)
                                d3.select(this.parentNode).select('.parent').style('fill-opacity', '0.5');
                        })
                        .on('mouseover', function(){
                            if(!transitioning)
                                d3.select(this.parentNode).select('.parent').style('fill-opacity', '0.8');
                        });

                // Text reflow
                g2.selectAll('.treemap-box-label')
                        .each( function() {

                            // Reduce text if it is overflowing
                            var self = d3.select(this);
                            var textLength = self.node().getComputedTextLength();
                            var label = self.text();
                            var containerWidth = d3.select(this.parentNode).select('.parent').attr('width');
                            var containerHeight = d3.select(this.parentNode).select('.parent').attr('height');
                            //var containerWidth = d3.select(this.parentNode).data()[0].dx;
                            //var containerHeight = d3.select(this.parentNode).data()[0].dy;

                            // Reset label
                            self.text('');

                            var words = label.split(' ');
                            var numWords = words.length;

                            // Add other words where there is space
                            var spaceFinished = false;
                            var writingCursor = self;
                            for(var i=0; i<numWords; i++){

                                writingCursor.text( writingCursor.text() + ' ' + words[i] );

                                spaceFinished = writingCursor.node().getComputedTextLength() + 10 > containerWidth;
                                //console.log(writingCursor.text(), spaceFinished);

                                if( spaceFinished ) {
                                    // Take away last word from previous row
                                    var row = writingCursor.text().split(' ');
                                    var lastWord = row[row.length-1];
                                    row = row.slice(0, -1);
                                    row = row.join(' ');
                                    writingCursor.text( row );

                                    // Append word to new line
                                    writingCursor.append('tspan')
                                            .attr('x', writingCursor.attr('x'))
                                            .attr('dy', '1.2em')
                                            .text(function(){
                                                return d3.select(this).text() + ' ' + lastWord;
                                            })
                                            .call(function(){
                                                writingCursor = this;
                                            });
                                }
                            }
                        });

            }

            function text(text) {
                text.attr('x', function(d) {
                    if(d) {
                        return x(d.x) + 6;
                    }
                    return 6;
                })
                .attr('y', function(d) {
                    if(d) {
                        return y(d.y) + 6;
                    }
                    return 6;
                })
                .style('cursor', leafPointer)
                .style('font-family', 'Titillium Web, Open Sans, Helvetica Neue, Helvetica, Arial, sans-serif');
            }

            function rect(rect) {
                rect.attr('x', function(d) {
                    return x(d.x);
                })
                .attr('y', function(d) {
                    return y(d.y);
                })
                .attr('width', function(d) {
                    return x(d.x + d.dx) - x(d.x);
                })
                .attr('height', function(d) {
                    return y(d.y + d.dy) - y(d.y);
                })
                .attr('fill', 'none')
                .attr('stroke', '#fff');
            }

            // Breadcumbs composition
            function name(d) {
                if(d.parent) {
                    return name(d.parent) + '/' + d.name;
                } else if(d.name){
                    return d.name;
                } else {
                    return '';
                }
            }

        }
    }();
};
