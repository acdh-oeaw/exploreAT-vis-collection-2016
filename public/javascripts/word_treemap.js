var root = {
 "name": "root",
 "type": "root",
 "children": []
};
var miRoot;
var originalRoot = root;

var boxString = "";

var indexV = "11";

var ip = 'http:\/\/'+'exploreat.usal.es';
var esClient = new $.es.Client({
  hosts: ip+"/elasticsearch"
});

var img_tooltip = $('#imgTooltip');
var lemma_tooltip = $('#lemmaTooltip');

function setupFloatingDivs() {
    img_tooltip.hide();
    lemma_tooltip.hide();

    $(document).mousemove(function(e){
        img_tooltip.css({'top': e.pageY-100,'left': e.pageX+20});
        lemma_tooltip.css({'top': e.pageY-100,'left': e.pageX+20});
    });
}

setupFloatingDivs();

// At first add the listener to the generation button

$('#errorMessage').hide();

$('#generateTreeButton').on("click", function(){
  $('#errorMessage').hide();
  if($('#filterField').val().length > 0 || $('#filterField').val() != ""){
    root = {
     "name": "root",
     "type": "root",
     "children": []
    };
    miRoot = root;
    originalRoot = root;
    $('#content').html('<div id="chart"></div>')
    createWords($('#filterField').val());
  }
  else{
    $('#errorMessage').show();
  }
});

// Use elasticsearch to generate the data structure and then the visualization
function createWords(inputString) {

  var searchOption = "";
  if(inputString.indexOf("*") >= 0){searchOption = "wildcard";}
  else{searchOption = "match";}

  inputString = "*"+inputString+"*";

  boxString = inputString.replace(/\*/g, '');

  // $.ajax({
  //   type: "GET",
  //   url: "api/es/bedeutung/"+inputString.toLowerCase(),
  //   dataType: "json",
  //   async: true,
  //   success: function (resp) {
  esClient.search({
    index: 'dboe-beleg_bedeutung_lemma_v'+indexV,
    body: {
        query : {
          bool: {
            must: [
              { wildcard: { "dbo" : inputString.toLowerCase() }},
              { not: { match: { "bedeutung.raw" : "--"  }}}
            ]
          }
        },
        // Get all the BEDEUTUNGs first
        aggs: {
            aggregation: {
                terms: {
                  field: "bedeutung.raw", "size": 10
                }
            }
        }
    }
  }).then(function (resp) {

    root.name = "Contexts containing: "+boxString;

    var children;

    var buckets = resp.aggregations.aggregation.buckets;
    var promises = [];

    // BEDEUTUNG buckets
    buckets.forEach(function(bucket,i){

      // One children per BEDEUTUNG
      children = {};
      children.name = ""+bucket.key;
      children.size = bucket.doc_count;
      children.type = "node bedeutung"
      children.children = new Array();

      root.children.push(children);

      promises.push(new Promise(
        function(resolve, reject) {

          // For each lade get only those lemmas where the lade is the same
          esClient.search({
            index: 'dboe-beleg_bedeutung_lemma_v'+indexV,
            body: {
                query: {
                  bool: {
                    must: [
                      { wildcard: { "dbo" : inputString.toLowerCase() }},
                      { match: { "bedeutung.raw" : root.children[i].name   }}
                    ]
                  }
                // },
                // aggs: {
                //   aggregation: {
                //     terms: {
                //       field: "dbo.raw",
                //       size: 30
                //     }
                //   }
                }
              }
            },
            function (error, resp2) {

              // var buckets = resp2.aggregations.aggregation.buckets;

              var lemmas = resp2.hits.hits;

              root.children[i].children = new Array();

              // For the selected BEDEUTUNG, we need to add all of its subchildrens (LEMMAS)
              // buckets.forEach(function(bucket,j){
              lemmas.forEach(function(lemma,j){

                // One children per BEDEUTUNG
                var subChildren = {};
                var realString = lemma._source.dbo
                .replace(" © 2008-2080 jost nickel","")
                .replace("+?+ ","")
                .replace("+? ","")
                .replace("+","")
                .replace("?","");
                subChildren.name = realString;
                if(lemma._source.quelle == undefined || lemma._source.quelle == ""){subChildren.quelle = "Unknown";}
                else{subChildren.quelle = lemma._source.quelle;}
                if(lemma._source.lokation == undefined || lemma._source.lokation == ""){subChildren.lokation = "Unknown";}
                else{subChildren.lokation = lemma._source.lokation;}
                if(lemma._source.lade == undefined || lemma._source.lade == ""){subChildren.lade = "Unknown";}
                else{subChildren.lade = lemma._source.lade;}
                if(lemma._source.belegjahr == undefined || lemma._source.belegjahr == ""){subChildren.belegjahr = "Unknown";}
                else{subChildren.belegjahr = lemma._source.belegjahr;}
                subChildren.size = 1;
                subChildren.type = "node lemma"
                // subChildren.children = new Array(); // This will hold words

                root.children[i].children.push(subChildren);
              });

              resolve();
            }
          )
        })
      );
    });

    Promise.all(promises).then(function() {

      //Get a photo for each node
      root.children.forEach(function(children,i){

        var name = root.children[i].name.split(";")[0].split(",")[0];
        if(name == undefined){name = root.children[i].name.split(";")[0];}
        if(name == undefined){name = root.children[i].name}

          $.ajax({
            type: "GET",
            url: "api/flickr/"+name,
            dataType: "json",
            async: true,
            success: function (response) {

              var photo = response.photos.photo[0];
              var imgURL = "";
              if(photo == undefined){
                imgURL = "img/home/blank_black.png";
              }
              else{
                imgURL = 'https://farm'+photo.farm+'.staticflickr.com/'+photo.server+'/'+photo.id+'_'+photo.secret+'.jpg'
              }
              root.children[i].photoURL = imgURL;

              // Append SVG def corresponding to the root's child picture

              var rootChildrens = $('.children');
              d3.select(rootChildrens[i])
                 .append("defs")
                 .append('pattern')
                 .attr('id', function(){return "img"+root.children[i].type.split(" ")[1]+i;})
                 .attr('patternUnits', 'userSpaceOnUse')
                 .attr('width', "100%")
                 .attr('height', "100%")
                 .append("image")
                 .attr("xlink:href", function(d){return imgURL;})
                 .attr('width', "100%")
                 .attr('height', "100%")
                 .attr('x', 0)
                 .attr('y', 0)
                 .attr('preserveAspectRatio','xMinYMin slice');

              //console.log("image fetched")
            }
          });
      });

      miRoot = root;
      originalRoot = root;

      generateVisualization();
    });
  });
}

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
  selection = selection.append('svg').style('width', '100%').style('height', '450px');

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
              .style('background', '#fdfdfd')
              .append('g')
                  .style('shape-rendering', 'crispEdges');

      var grandparent = selection.append('g')
              .attr('class', 'grandparent');

      grandparent.append('rect')
              .attr('width', width)
              .attr('height', marginTop)
              .attr('fill', '#e66c6c')
              .style('cursor', 'pointer')
              .on('mouseout', function(){
                  d3.select(this).attr('fill', '#e66c6c');
              })
              .on('mouseover', function(){
                  d3.select(this).attr('fill', '#ae3030');
              });

      grandparent.append('text')
        .attr("dy",".75em")
        .attr("class","treeRootText")
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
      // the children being overwritten when layout is computed.
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
                  .style('fill', getColor)
                  .on('mouseout', function(){
                      lemma_tooltip.hide();
                      lemma_tooltip.html("");
                  })
                  .on('mouseover', function(d,i){
                    if(d.type.indexOf("lemma") >= 0){
                      lemma_tooltip.show();
                      lemma_tooltip.html(function(){
                        var html = '';
                        html += '<div class="title">'+d.name+'</div>';
                        html += '<div class="box">';
                        html += '<div class="left-side">Context</div>';
                        html += '<div class="right-side">'+$('g.grandparent > text').html().replace("./","")+'</div>';
                        html += '<div class="clearfix"></div>';
                        html += '</div>';
                        html += '<div class="box">';
                        html += '<div class="left-side">Source</div>';
                        html += '<div class="right-side">'+d.quelle+'</div>';
                        html += '<div class="clearfix"></div>';
                        html += '</div>';
                        html += '<div class="box">';
                        html += '<div class="left-side">Location</div>';
                        html += '<div class="right-side">'+d.lokation+'</div>';
                        html += '<div class="clearfix"></div>';
                        html += '</div>';
                        html += '<div class="box">';
                        html += '<div class="left-side">Drawer</div>';
                        html += '<div class="right-side">'+d.lade+'</div>';
                        html += '<div class="clearfix"></div>';
                        html += '</div>';
                        html += '<div class="box">';
                        html += '<div class="left-side">Year</div>';
                        html += '<div class="right-side">'+d.belegjahr+'</div>';
                        html += '<div class="clearfix"></div>';
                        html += '</div>';
                        return html;
                      });
                    };
                  });


                  // g.append("defs")
                  //    .append('pattern')
                  //    .attr('id', function(d,i){return "img"+d.type.split(" ")[1]+i;})
                  //    .attr('patternUnits', 'userSpaceOnUse')
                  //    .attr('width', "100%")
                  //    .attr('height', "100%")
                  //    .append("image")
                  //    .attr("xlink:href", function(d){return d.photoURL;})
                  //    .attr('width', "100%")
                  //    .attr('height', "100%")
                  //    .attr('x', 0)
                  //    .attr('y', 0)
                  //    .attr('preserveAspectRatio','xMidYMid slice');

          g.append('rect')
                  .attr('class', 'parent')
                  .call(rect)
                  .style('cursor', leafPointer)
                  .style('fill-opacity', '0.5')
                  .style('fill', function(d,i){
                    // Childs are appended bottom-to-top, so we invert the index
                    return "url(#img"+d.type.split(" ")[1]+(root.children.length-1-i)+")";
                  })
                  .style('stroke-width', '2px')
                  .on('mouseout', function(){
                      img_tooltip.hide();
                      img_tooltip.html("");
                      d3.select(this).style('fill-opacity', '0.5');
                  })
                  .on('mouseover', function(d,i){
                    console.log(d.type)
                      if(d.type.indexOf("bedeutung") >= 0){
                        img_tooltip.show();
                        img_tooltip.html('<img src="'+root.children[root.children.length-1-i].photoURL+'" />');
                      }
                      d3.select(this).style('fill-opacity', '0.8');
                  })
                  .on('click', leafClicked)
                  .append('title')
                  .text(function(d) {
                      return d.name;
                  })
                ;



          // Animation
          function transition(d) {

              img_tooltip.hide();

              if(d.type.indexOf("bedeutung") >= 0){
                root.name = ".";
              }
              else if(d.type.indexOf("root") >= 0){
                root.name = "Contexts containing: "+boxString;
              }

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

              // If we go back to root, we need to reload the pictures
              if(d.type.indexOf("root") >= 0){
                // Append SVG def corresponding to the root's child picture

                var rootChildrens = $('.children');
                for(var i=0; i<root.children.length; i++){
                  d3.select(rootChildrens[i])
                     .append("defs")
                     .append('pattern')
                     .attr('id', function(){return "img"+root.children[i].type.split(" ")[1]+i;})
                     .attr('patternUnits', 'userSpaceOnUse')
                     .attr('width', "100%")
                     .attr('height', "100%")
                     .append("image")
                     .attr("xlink:href", function(){return root.children[i].photoURL;})
                     .attr('width', "100%")
                     .attr('height', "100%")
                     .attr('x', 0)
                     .attr('y', 0)
                     .attr('preserveAspectRatio','xMinYMin slice');
                }
              }
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
          return '#ededed';
      }

      function refreshLabels(g2, d) {

          g2.append('text')
                  .classed('treemap-box-label', true)
                  .attr('dy', '.75em')
                  .text(function(d) {
                      if(d.type.indexOf("bedeutung") >= 0){
                        return d.name + ' (' + formatNumber(d.value) + ')';
                      }
                      else{
                        return d.name;
                      }
                  })
                  .attr('font-size', function(d){

                      var containerWidth = d3.select(this.parentNode).select('.parent').attr('width');
                      var containerHeight = d3.select(this.parentNode).select('.parent').attr('height');

                      //var containerWidth = d3.select(this.parentNode).data()[0].dx;
                      //var containerHeight = d3.select(this.parentNode).data()[0].dy;

                      var containerAvg = Math.sqrt(containerWidth * containerHeight);

                      var fontSize = 0.6 * containerAvg/ Math.sqrt(d.name.length);

                      if(fontSize < 6){
                          fontSize = 0;
                      }
                      if(fontSize > 30) {
                          fontSize = 30;
                      }

                      return fontSize;
                  })
                  .call(text)
                  .style('fill',function(d){
                    if(d.type.indexOf("bedeutung") >= 0 || d.type.indexOf("root") >= 0 ){
                      return "white";
                    }
                    else {
                      return "black";
                    }
                  })
                  .style('pointer-events', function(d){
                    if(d.type.indexOf("bedeutung") >= 0 || d.type.indexOf("root") >= 0){return "auto";}
                    else{return "none";}
                  })
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
          .style('font-family', 'Titillium Web, Open Sans, Helvetica Neue, Helvetica, Arial, sans-serif')
          ;
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
