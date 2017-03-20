var root = {
    "name": "ExploreAT!",
    "type": "root",
    "children": []
};
var response;
var processing = false;

var boxString = "";

var ESToken = getCookie("token");

var esClient = new $.es.Client({
    host: getESHost(),
    headers: {
        'Authorization' : "Bearer " + ESToken}
    });


    // AUTOMATIC INITIALIZATION
    // processing = true;
    // createWords("*");
    ///////////////////////////

    $('#generateButton').on("click", function(){
        if(!processing){createWords();}
    });

    $('#filterFragebogen').keyup(function(){
        if(!processing){createWords();}
    });

    $('#filterFrage').keyup(function(){
        if(!processing){createWords();}
    });

    $('#filterLemma').keyup(function(){
        if(!processing){createWords();}
    });

    function resetViz(){

        d3.select('#spinner').classed('hidden',false);

        processing = true;

        $('#chart').html('');

        root = {
            "name": "ExploreAT!",
            "type": "root",
            "children": []
        };
    }

    function createWords() {

        resetViz();

        var inputFragebogen = $('#filterFragebogen').val().toLowerCase();
        var inputFrage = $('#filterFrage').val().toLowerCase();
        var inputLemma = $('#filterLemma').val().toLowerCase();

        if(inputFragebogen == "") {inputFragebogen = "*";}
        else{inputFragebogen = "*"+inputFragebogen+"*"}
        if(inputFrage == "") {inputFrage = "*";}
        else{inputFrage = "*"+inputFrage+"*"}
        if(inputLemma == ""){inputLemma = "*";}
        else{inputLemma = "*"+inputLemma+"*"}

        esClient.search({
            index: 'dboe-beleg-frage-fragebogen-lemma',
            headers: {
                'Authorization' : "Bearer " + ESToken },
                size: 1000,
                body: {
                    query : {
                        bool: {
                            must: [
                                { wildcard: { "frages.lemmas.dbo.raw" : inputLemma }},
                                { wildcard: { "frages.originalFrage.raw" : inputFrage }},
                                { wildcard: { "fragebogen_titel.raw" : inputFragebogen }}
                            ]
                        }
                    }
                },
                sort: "fragebogen_nummer:asc"
            }).then(function (resp) {

                root.name = "ExploreAT!";

                for(var i=0; i<resp.hits.hits.length; i++){

                    var fragebogen = {};

                    fragebogen.name = "FB: "+resp.hits.hits[i]._source.fragebogen_nummer+" - "+resp.hits.hits[i]._source.fragebogen_titel;
                    if(fragebogen.name.length > 33){
                        fragebogen.shortname = "FB: "+resp.hits.hits[i]._source.fragebogen_nummer+" - "+resp.hits.hits[i]._source.fragebogen_titel.substring(0,30)+"...";
                    }
                    else{
                        fragebogen.shortname = fragebogen.name;
                    }
                    fragebogen.type = "fragebogen";
                    var frageArray = [];
                    fragebogen.children = frageArray;

                    for(var j=0; j<resp.hits.hits[i]._source.frages.length && j<2000; j++){

                        if(resp.hits.hits[i]._source.frages[j] != undefined){

                            if(resp.hits.hits[i]._source.frages[j].originalFrage.toLowerCase().indexOf(inputFrage.replace(/\*/g , "")) > -1){

                                var frage = {};
                                frage.name = "FR: "+resp.hits.hits[i]._source.frages[j].originalFrage;
                                if(frage.name.length > 80){
                                    frage.name = frage.name.substring(0,75)+"...";
                                }
                                if(frage.name.length > 33){
                                    frage.shortname = "FR: "+resp.hits.hits[i]._source.frages[j].originalFrage.substring(0,30)+"...";
                                }
                                else{
                                    frage.shortname = frage.name;
                                }
                                frage.type = "frage";
                                var lemmaArray = [];
                                frage.children = lemmaArray;

                                for(var k=0; k<resp.hits.hits[i]._source.frages[j].lemmas.length && k<2000; k++){

                                    if(resp.hits.hits[i]._source.frages[j].lemmas[k] != undefined){

                                        if(resp.hits.hits[i]._source.frages[j].lemmas[k].dbo.toLowerCase().indexOf(inputLemma.replace(/\*/g , "")) > -1){

                                            var lemma = {};
                                            lemma.name = "LM: "+resp.hits.hits[i]._source.frages[j].lemmas[k].dbo;
                                            if(lemma.name.length > 33){
                                                lemma.shortname = "LM: "+resp.hits.hits[i]._source.frages[j].lemmas[k].dbo.substring(0,30+"...");
                                            }
                                            else{
                                                lemma.shortname = lemma.name;
                                            }
                                            lemma.type = "lemma";
                                            lemma.size = 1;

                                            lemmaArray.push(lemma);
                                        }
                                    }
                                }
                                frage.size = lemmaArray.length;

                                if(frage.size > 0) {
                                    frageArray.push(frage);
                                }
                            }
                        }
                    }
                    fragebogen.size = frageArray.length;

                    if(fragebogen.size > 0){
                        root.children.push(fragebogen);
                    }
                }

                if(root.children.size == 0) {
                    d3.select('#spinner').classed('hidden',true);
                    return;
                }

                generateVisualization();
                d3.select('#spinner').classed('hidden',true);
                processing = false;
            });
        }

        var margin = 50;
        var diameter;

        var color = d3.scale.linear()
        .domain([-1, 5])
        .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
        .interpolate(d3.interpolateHcl);

        var pack;
        var svg;
        var focus;
        var nodes;
        var view;
        var circle;
        var text;
        var node;

        function generateVisualization() {

            diameter = parseInt($(document).height()-240);

            pack = d3.layout.pack()
            .padding(2)
            .size([diameter - margin, diameter - margin])
            .value(function(d) { return d.size; })

            ///

            svg = d3.select("#chart").append("svg")
            .attr("width", parseInt($("#chart").width())-1)
            .attr("height", diameter+12)
            .append("g")
            .attr("transform", "translate(" + (parseInt($("#chart").width())-1) / 2 + "," + (diameter+12) / 2 + ")");

            focus = root;
            nodes = pack.nodes(root);
            view;

            circle = svg.selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("class", function(d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
            .style("fill", function(d) { return d.children ? color(d.depth) : null; })
            .on("click", function(d,i) {
                if (focus !== d) zoom(d), d3.event.stopPropagation();
                var texts = svg.selectAll("text");
                if(focus.type != "lemma"){
                    $(texts[0][i]).hide();
                    $(text[0][i]).css("fill-opacity",0);
                }
            })
            .on("mouseover", function(d,i) {

                var texts = svg.selectAll("text");
                for(var j=0; j<texts[0].length; j++){
                    $(texts[0][j]).hide();
                    $(text[0][j]).css("fill-opacity",0);
                }

                $(texts[0][i]).show();
                $(text[0][i]).css("fill-opacity",1);

                if(focus.type == "root" && d.type == "frage" && d.parent.children.length == 1){
                    $(texts[0][i]).html(d.parent.name);
                }
                else if(focus.type == "root" && d.type == "frage" && d.parent.children.length > 1){
                    $(texts[0][i]).html(d.name);
                }
                else if(focus.type == "frage" && d.children.length == 1){
                    $(texts[0][i]).html(d.children[0].name);
                }
                else{
                    $(texts[0][i]).html(d.name);
                }

            })
            .on("mouseout", function(d,i) {
                var texts = svg.selectAll("text");
                if(focus.children.length > 0){
                    $(texts[0][i]).hide();
                    $(text[0][i]).css("fill-opacity",0);
                }
                $(texts[0][i]).html(d.shortname);
            });

            text = svg.selectAll("text")
            .data(nodes)
            .enter().append("text")
            .attr("class", "label")
            .attr("transform", "translate(0,0)")
            .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
            .style("display", function(d) {
                //return d.parent === root ? "inline" : "none";
                if(focus != undefined && focus.children != undefined){
                    if(focus.children.length < 10 || focus.type == "frage"){
                        return "inline";
                    }
                }
                return "none";
            })
            .text(function(d) {
                var html = "";
                html += '<tspan x="0" dy="1.2em">'+d.name.substring(0,parseInt(d.name.length/2))+'</tspan>';
                html += '<tspan x="0" dy="1.2em">'+d.name.substring(parseInt(d.name.length/2),parseInt(d.name.length/2)-1)+'</tspan>';
                //return html;
                return d.shortname;
            });

            node = svg.selectAll("circle,text");

            d3.select("#chart")
            .style("background", /*color(-1)*/ "#efefef")
            .style("border", "1px solid #e0e0e0")
            .style("text-align", "center")
            .on("click", function() { zoom(root); });

            zoomTo([root.x, root.y, root.r * 2 + margin]);

            function zoom(d) {
                var focus0 = focus;
                focus = d;

                var transition = d3.transition()
                .duration(d3.event.altKey ? 7500 : 750)
                .tween("zoom", function(d) {
                    var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
                    return function(t) { zoomTo(i(t)); };
                });

                transition.selectAll("text")
                .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
                .style("fill-opacity", function(d) {
                    return d.parent === focus ? 1 : 0;
                })
                .style("display", function(d) {
                    if(focus.children.length < 10 || focus.type == "frage"){
                        return "inline";
                    }
                    return "none";
                })
                .each("start", function(d) {
                    if (d.parent === focus) this.style.display = "inline";
                })
                .each("end", function(d) {
                    if (d.parent !== focus) this.style.display = "none";
                });
            }

            function zoomTo(v) {
                var k = diameter / v[2]; view = v;
                node.attr("transform", function(d) {
                    if(isNaN(d.x) || isNaN(v[0]) || isNaN(d.y) || isNaN(v[1]) || isNaN(k)){
                        return "translate(0,0)";
                    }
                    return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")";
                });
                circle.attr("r", function(d) {
                    if(isNaN(d.r) || isNaN(k)){
                        return 0;
                    }
                    return d.r * k;
                });
            }

            d3.select(self.frameElement).style("height", diameter + "px");
        };
