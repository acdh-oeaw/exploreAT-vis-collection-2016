// var ip = 'http:\/\/'+'exploreat.usal.es';
// var esClient = new $.es.Client({
//     hosts: ip+"/elasticsearch"
// });

var esClient = new $.es.Client({
  hosts: "http:\/\/localhost:9200\/"
});

var resultsLimit = 5000;

var processing;

var minYear = 1; var userMinYear = 0;
var maxYear = 0; var userMaxYear = 1;
var minLetter;
var maxLetter;
var minCount;
var maxCount;

var wordArray = [];
var fullWordArray = [];
var letterArray = [];
var letterArrayNumbers = [];

function genCharArray(charA, charZ) {
    var a = [], i = charA.charCodeAt(0), j = charZ.charCodeAt(0);
    for (; i <= j; ++i) { a.push(String.fromCharCode(i)); }
    return a;
}

function genNumberArray(start, end) {
    var a = [];
    for (i=start; i<end; i++) { a.push(i); }
    return a;
}

letterArray = genCharArray('a','z').reverse();
letterArrayNumbers = genNumberArray(0,letterArray.length).reverse();

esClient.search({
  index: 'tustep',
  scroll: '30s',
  body: {
    "size": 9999, // 10000+ == ERROR
    "query": {
      "filtered": {
        "filter": {
          "bool": {
            "must_not": [
              {
                "missing": {
                  "field": "years"
                }
              }
            ],
            "must": {
              "regexp": {
                "mainLemma.raw": "[a-z].*"
              }
            }
          }
        }
      }
    }
  }
}, function getMoreUntilDone(error, response) {

  processing = true;

  response.hits.hits.forEach(function (hit) {
    wordArray.push(hit._source);
  });

  if (response.hits.total !== wordArray.length) {
    esClient.scroll({
      scrollId: response._scroll_id,
      scroll: '5s'
    }, getMoreUntilDone);
  } else {
    generateFullWordArray();
    getMathValues();
    generateScatter();

    processing = false;
  }
});

function generateFullWordArray(){

  for(var i=0; i<wordArray.length && i<resultsLimit; i++){
    for(var j=0; j<wordArray[i].years.length; j++){
      var leftLemma = wordArray[i].leftLemma;
      if(wordArray[i].leftLemma != undefined){
        leftLemma = wordArray[i].leftLemma
        .replace(/[^A-Za-záéíóú´àèìòùäëïöüâêîôû]/g,'');
      }
      else{ leftLemma = ""; }
      fullWordArray.push({
        "mainLemma":wordArray[i].mainLemma
        .replace(/[áàäâ]/g,'a')
        .replace(/[éèëê]/g,'e')
        .replace(/[íìïî]/g,'i')
        .replace(/[óòöô]/g,'o')
        .replace(/[úùüû]/g,'u')
        .replace(/[^A-Za-záéíóú´àèìòùäëïöüâêîôû]/g,''),
        "leftLemma":leftLemma,
        "wordType":wordArray[i].wordType,
        "year":wordArray[i].years[j],
        "totalCount":wordArray[i].totalCount
      });
    }
  }

  function compare(a,b) {
    if (a.totalCount < b.totalCount) return 1;
    else if (a.totalCount > b.totalCount) return -1;
    else return 0;
  }
  fullWordArray.sort(compare);

  wordArray = fullWordArray;
}

function getMathValues(){

  // minYear = d3.min(wordArray, function(d) { return d3.min(d.years, function(d) { return +d; }); });
  // maxYear = d3.max(wordArray, function(d) { return d3.max(d.years, function(d) { return +d; }); });
  if(userMinYear > minYear) {minYear = userMinYear;}
  else{minYear = d3.min(wordArray, function(d) { return d.year; });}
  if(userMaxYear < maxYear) {maxYear = userMaxYear;}
  else{maxYear = d3.max(wordArray, function(d) { return d.year; });}
  minCount = d3.min(wordArray, function(d) { return d.totalCount; });
  maxCount = d3.max(wordArray, function(d) { return d.totalCount; });
  minLetter = 0;
  maxLetter = letterArray.length-1;
}

var margin = {top: 20, right: 20, bottom: 30, left: 40},
  width = 960 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;
var xValue, xScale, xMap, xAxis; // x values
var yValue, yScale, yMap, yAxis; // y values
var r; // radius

var formatLetters = function(d) {
  return letterArray[d].toUpperCase();
};

var cValue = function(d) { return d.totalCount;}; // colors
var color = d3.scale.category10();

var svg;
var tooltip;

function generateScatter(){

  // setup x
  xValue = function(d) { return d.year;}; // data -> value
  xScale = d3.scale.linear().range([0, width]); // value -> display
  xMap = function(d) { return xScale(xValue(d));}; // data -> display
  xAxis = d3.svg.axis().scale(xScale).orient("bottom");

  // setup y
  yValue = function(d) { return letterArray.indexOf(d.mainLemma.charAt(0));}; // data -> value
  yScale = d3.scale.linear().range([height, 0]); // value -> display
  yMap = function(d) { return yScale(yValue(d));}; // data -> display
  yAxis = d3.svg.axis().scale(yScale).orient("left").tickFormat(formatLetters).tickValues(letterArrayNumbers);

  // setup r
  r = d3.scale.linear()
      .domain([minCount, maxCount])
      .range([2, 8]);

  // add the graph canvas to the body of the webpage
  svg = d3.select("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // add the tooltip area to the webpage
  tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

  // don't want dots overlapping axis, so add in buffer to data domain
  if($('#filterMinYear').val() == "") {xScale.domain([minYear-25, parseInt(maxYear)+25]);}
  else{xScale.domain([minYear, parseInt(maxYear)]);}
  yScale.domain([0, letterArray.length-1]);

  // x-axis
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Year");

  // y-axis
  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Letter");

  // draw dots
  svg.selectAll(".dot")
      .data(wordArray)
    .enter().append("circle")
      .attr("class", function(d){return "dot";})
      .attr("data-mainLemma", function(d){return d.mainLemma;})
      .attr("data-leftLemma", function(d){return d.leftLemma;})
      .attr("r", function(d){return r(d.totalCount);})
      .attr("cx", xMap)
      .attr("cy", yMap)
      // .style("fill", function(d) { return "black"; /*return color(cValue(d));*/})
      .on("mouseover", function(d) {

        var sameMainWords;
        var sameLeftMainWords;
        var sameLeftWords;
        var otherWords;

        sameMainWords = d3.selectAll('.dot').filter(function(dd){return dd.mainLemma == d.mainLemma});
        if(d.leftLemma != ""){
          sameLeftMainWords = d3.selectAll('.dot').filter(function(dd){return (dd.leftLemma == d.leftLemma && dd.mainLemma == d.mainLemma)});
          sameLeftWords = d3.selectAll('.dot').filter(function(dd){return dd.leftLemma == d.leftLemma});
        }
        else{sameLeftMainWords = sameLeftWords = d3.selectAll('.mustbereallywrong');}
        otherWords = d3.selectAll('.dot').filter(function(dd) {
          return (dd.mainLemma != d.mainLemma);
        });

        otherWords.attr("r", function(d){return r(minCount);})
        .style("fill","black")
        .style("opacity",".05");

        sameMainWords.attr("r", function(d){return r(maxCount);})
        .style("fill","#6fcb9f")
        .style("opacity",".8");

        sameLeftMainWords.attr("r", function(d){return r(maxCount);})
        .style("fill","#88d8b0")
        .style("opacity",".8");

        sameLeftWords.attr("r", function(d){return r(maxCount);})
        .style("fill","#99ccff")
        .style("opacity",".8");

        d3.select(this)
        .style("fill",function(){
          if(sameLeftMainWords[0].length > 1){return "#88d8b0";}
          else if(sameMainWords[0].length > 1){return "#ffcc5c";}
          else if(sameLeftWords[0].length > 1){return "#99ccff";}
          else{return "black";}
        });

          tooltip.transition()
               .duration(200)
               .style("opacity", .9);

          tooltip.style("opacity",.9);

          tooltip.html(function(){
            var html = "";
            if(d.leftLemma != "" && d.leftLemma != undefined){html += "("+d.leftLemma+")";}
            html += "<b>"+d.mainLemma + "</b><br/>" + xValue(d);
            return html;
          })
          .style("left", (d3.event.pageX + 5) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {

        d3.selectAll('.dot').attr("r", function(d){return r(d.totalCount);})
        .style("fill","black")
        .style("opacity",".05");

          tooltip.transition()
               .duration(500)
               .style("opacity", 0);

          tooltip.style("opacity",0);
      });
}

$('#filterMainLemma').on('input',function(){ handleFilters(); });
$('#filterLeftLemma').on('input',function(){ handleFilters(); });
$('#filterMinYear').on('input',function(){ handleFilters(); });
$('#filterMaxYear').on('input',function(){ handleFilters(); });
function handleFilters(){

  if(processing) return;

  processing = true;

  var inputMainLemma = $('#filterMainLemma').val().toLowerCase();
  var inputLeftLemma = $('#filterLeftLemma').val().toLowerCase();
  userMinYear = parseInt($('#filterMinYear').val());
  userMaxYear = parseInt($('#filterMaxYear').val());

  wordArray = new Array();

  for(var i=0; i<fullWordArray.length; i++){
    if(fullWordArray[i].mainLemma.indexOf(inputMainLemma) > -1 || inputMainLemma == ""){
      if(fullWordArray[i].leftLemma.indexOf(inputLeftLemma) > -1 || inputLeftLemma == ""){
        if(fullWordArray[i].year >= userMinYear && fullWordArray[i].year <= userMaxYear){
          wordArray.push(fullWordArray[i]);
        }
      }
    }
  }

  getMathValues();
  recalculateScatter();
  redrawScatter();
}

function updateScatter() {

  svgDots.attr("class", function(d){ return "dot "+d.mainLemma;})
    .attr("r", function(d){return r(d.totalCount);})
    .attr("cx", xMap)
    .attr("cy", yMap)
}

function recalculateScatter() {

  // setup x
  xValue = function(d) { return d.year;}; // data -> value
  xScale = d3.scale.linear().range([0, width]); // value -> display
  xMap = function(d) { return xScale(xValue(d));}; // data -> display
  xAxis = d3.svg.axis().scale(xScale).orient("bottom");

  // setup r
  r = d3.scale.linear()
      .domain([minCount, maxCount])
      .range([2, 8]);

  // don't want dots overlapping axis, so add in buffer to data domain
  if($('#filterMinYear').val() == "") {xScale.domain([minYear-25, parseInt(maxYear)+25]);}
  else{xScale.domain([minYear, parseInt(maxYear)]);}
  yScale.domain([0, letterArray.length-1]);
}

var svgDots;

function redrawScatter() {

  svgDots = svg.selectAll(".dot")
  .data(wordArray);

  // x-axis
  svg.select(".x.axis").transition()
  .duration(200)
  .style("opacity", 0)
  .remove()
  .each("end", function(){
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
      .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Year");
    processing = false;
  });

  updateScatter();

  svgDots.exit()
    .remove();

  svgDots.enter()
  .append("circle")
  .attr("class", function(d){return "dot";})
  .attr("data-mainLemma", function(d){return d.mainLemma;})
  .attr("data-leftLemma", function(d){return d.leftLemma;})
  .attr("r", function(d){return r(d.totalCount);})
  .attr("cx", xMap)
  .attr("cy", yMap)
  // .style("fill", function(d) { return "black"; /*return color(cValue(d));*/})
  .on("mouseover", function(d) {

    var sameMainWords;
    var sameLeftMainWords;
    var sameLeftWords;
    var otherWords;

    sameMainWords = d3.selectAll('.dot').filter(function(dd){return dd.mainLemma == d.mainLemma});
    if(d.leftLemma != ""){
      sameLeftMainWords = d3.selectAll('.dot').filter(function(dd){return (dd.leftLemma == d.leftLemma && dd.mainLemma == d.mainLemma)});
      sameLeftWords = d3.selectAll('.dot').filter(function(dd){return dd.leftLemma == d.leftLemma});
    }
    else{sameLeftMainWords = sameLeftWords = d3.selectAll('.mustbereallywrong');}
    otherWords = d3.selectAll('.dot').filter(function(dd) {
      return (dd.mainLemma != d.mainLemma);
    });

    otherWords.attr("r", function(d){return r(minCount);})
    .style("fill","black")
    .style("opacity",".05");

    sameMainWords.attr("r", function(d){return r(maxCount);})
    .style("fill","#ffcc5c")
    .style("opacity",".8");

    sameLeftWords.attr("r", function(d){return r(maxCount);})
    .style("fill","#99ccff")
    .style("opacity",".8");

    sameLeftMainWords.attr("r", function(d){return r(maxCount);})
    .style("fill","#88d8b0")
    .style("opacity",".8");

    d3.select(this)
    .style("fill",function(){
      if(sameLeftMainWords[0].length > 1){return "#88d8b0";}
      else if(sameMainWords[0].length > 1){return "#ffcc5c";}
      else if(sameLeftWords[0].length > 1){return "#99ccff";}
      else{return "black";}
    });

      tooltip.transition()
           .duration(200)
           .style("opacity", .9);

      tooltip.style("opacity",.9);

      tooltip.html(function(){
        var html = "";
        if(d.leftLemma != "" && d.leftLemma != undefined){html += "("+d.leftLemma+")";}
        html += "<b>"+d.mainLemma + "</b><br/>" + xValue(d);
        return html;
      })
      .style("left", (d3.event.pageX + 5) + "px")
      .style("top", (d3.event.pageY - 28) + "px");
  })
  .on("mouseout", function(d) {

    d3.selectAll('.dot').attr("r", function(d){return r(d.totalCount);})
    .style("fill","black")
    .style("opacity",".05");

      tooltip.transition()
           .duration(500)
           .style("opacity", 0);

      tooltip.style("opacity",0);
  });
}
