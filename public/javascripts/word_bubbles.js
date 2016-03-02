var bubbles = new Array();
var bubblesFiltered = new Array();

var width = 700,
    height = 500;

var force;
var svg;

var	padding = 3;
var radius = d3.scale.sqrt().range([0, 12]);

createWords();

// Call for the persons stored in the DB
function createWords() {
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

function dealWithData(response){

  // Create a Bubble for each Word
  for(var i=0; i<response.rows.length; i++){

    var bubble = {};

    bubble.radius = 6;
    bubble.bigradius = 6;
    bubble.cx = width/2;
    bubble.cy = height/2;
    bubble.color = '#'+Math.floor(Math.random()*16777215).toString(16);
    bubble.id = response.rows[i].id;
    bubble.lemma = response.rows[i].dbo;

    bubbles.push(bubble);
    bubblesFiltered.push(bubble);
  }

  setupFilters();
  createVisualization();
}

function setupFilters(){

    // WORD FILTER

    $('#searchField').keyup(function(){
      handleFilters();
    });
}

function handleFilters(){

  bubblesFiltered = [];
  unkFound = susFound = adjFound = advFound = verFound = 0;

  for(var i=0; i<bubbles.length; i++){

    if(bubbles[i].lemma.toLowerCase().indexOf($('#searchField').val().toLowerCase()) > -1
    || $('#searchField').val() == "") {
      bubblesFiltered.push(bubbles[i]);
    }
  }

  redraw();
}

function createVisualization(){

  force = d3.layout.force()
      .nodes(bubblesFiltered)
      .size([width, height])
      .gravity(0)
      .charge(0)
      .on("tick", tick)
      .start();

    svg = d3.select('#chart').append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g");

    var circle = svg.selectAll("circle")
      .data(bubblesFiltered)
      .enter().append("circle")
      .attr("r", function (d) {
        return d.radius;
      })
      .style("fill", function (d) {
        return d.color;
      })
      .call(force.drag);

    circle.on('mouseover', function() {
      d3.select(this).transition().attr('fill', function(d) {
        return "red";
      });
    });

    circle.on('mouseout', function() {
      d3.select(this).transition().attr('fill', function(d) {
        return "black";
      });
    });

    function tick(e) {
      circle.each(gravity(0.2 * e.alpha))
      .each(collide(0.1))
      .attr("cx", function (d) {
        return d.x;
      })
      .attr("cy", function (d) {
        return d.y;
      });
    }

  // Move nodes toward cluster focus.
  function gravity(alpha) {
      return function (d) {
          d.y += (d.cy - d.y) * alpha;
          d.x += (d.cx - d.x) * alpha;
      };
  }

  // Resolve collisions between nodes.
  function collide(alpha) {
      var quadtree = d3.geom.quadtree(bubbles);
      return function (d) {
          var r = d.radius + radius.domain()[1] + padding,
              nx1 = d.x - r,
              nx2 = d.x + r,
              ny1 = d.y - r,
              ny2 = d.y + r;
          quadtree.visit(function (quad, x1, y1, x2, y2) {
              if (quad.point && (quad.point !== d)) {
                  var x = d.x - quad.point.x,
                      y = d.y - quad.point.y,
                      l = Math.sqrt(x * x + y * y),
                      r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
                  if (l < r) {
                      l = (l - r) / l * alpha;
                      d.x -= x *= l;
                      d.y -= y *= l;
                      quad.point.x += x;
                      quad.point.y += y;
                  }
              }
              return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
          });
      };
  }
}

function redraw() {

  force = d3.layout.force()
    .nodes(bubblesFiltered)
    .size([width, height])
    .gravity(0)
    .charge(0)
    .on("tick", tick)
    .start();

  var circle = svg.selectAll("circle")
    .data(bubblesFiltered);

  circle
  .attr("r", function (d) {
    return d.radius;
  })
  .style("fill", function (d) {
    return d.color;
  });

  circle.exit()
    .remove();

  circle.enter()
    .append("circle")
    .attr("r", function (d) {
      return d.radius;
    })
    .style("fill", function (d) {
      return d.color;
    })
    .call(force.drag);



  circle.on('mouseover', function() {
    d3.select(this).transition().attr('fill', function(d) {
      return "red";
    });
  });

  circle.on('mouseout', function() {
    d3.select(this).transition().attr('fill', function(d) {
      return "black";
    });
  });

  function tick(e) {
    circle.each(gravity(0.2 * e.alpha))
    .each(collide(0.5))
    .attr("cx", function (d) {
      return d.x;
    })
    .attr("cy", function (d) {
      return d.y;
    });
  }

  // Move nodes toward cluster focus.
  function gravity(alpha) {
      return function (d) {
          d.y += (d.cy - d.y) * alpha;
          d.x += (d.cx - d.x) * alpha;
      };
  }

  // Resolve collisions between nodes.
  function collide(alpha) {
      var quadtree = d3.geom.quadtree(bubbles);
      return function (d) {
          var r = d.radius + radius.domain()[1] + padding,
              nx1 = d.x - r,
              nx2 = d.x + r,
              ny1 = d.y - r,
              ny2 = d.y + r;
          quadtree.visit(function (quad, x1, y1, x2, y2) {
              if (quad.point && (quad.point !== d)) {
                  var x = d.x - quad.point.x,
                      y = d.y - quad.point.y,
                      l = Math.sqrt(x * x + y * y),
                      r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
                  if (l < r) {
                      l = (l - r) / l * alpha;
                      d.x -= x *= l;
                      d.y -= y *= l;
                      quad.point.x += x;
                      quad.point.y += y;
                  }
              }
              return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
          });
      };
  }
}
