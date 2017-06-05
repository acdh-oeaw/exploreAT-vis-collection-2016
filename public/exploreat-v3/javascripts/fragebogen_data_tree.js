var root = {
    "name": "ExploreAT!",
    "type": "root",
    "children": []
};
var response;
var processing = false;

var boxString = "";

var ESToken = getToken();

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

        processing = true;

        $('#content').html(function(){
            var html = "";
            html += '<div id="spinner">';
            html += '<i class="fa fa-circle-o-notch fa-spin fa-2x"></i>';
            html += '</div>';
            html += '<div id="chart"></div>';
            return html;
        });

        root = {
            "name": "ExploreAT!",
            "type": "root",
            "children": []
        };
    }

    function createWords(inputString) {

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

        if(inputLemma == "*" && inputFrage == "*" && inputFragebogen == "*"){
            console.log("type smth");
            $('#content').html(function(){
                var html = "";
                html += '<div id="spinner">';
                html += 'Type something in the filters before generating the graph';
                html += '</div>';
                html += '<div id="chart"></div>';
                return html;
            });
            processing = false;
            return;
        }

        esClient.search({
            index: 'dboe-beleg-frage-fragebogen-lemma',
            headers: {
                'Authorization' : "Bearer " + ESToken},
                size: 1000,
                body: {
                    query : {
                        // match_all: {}
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
                    if(fragebogen.name.length > 123){
                        fragebogen.shortname = "FB: "+resp.hits.hits[i]._source.fragebogen_nummer+" - "+resp.hits.hits[i]._source.fragebogen_titel.substring(0,120)+"...";
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
                                if(frage.name.length > 123){
                                    frage.name = frage.name.substring(0,120)+"...";
                                }
                                if(frage.name.length > 117){
                                    frage.shortname = "FR: "+resp.hits.hits[i]._source.frages[j].originalFrage.substring(0,114)+"...";
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
                                            if(lemma.name.length > 123){
                                                lemma.shortname = "LM: "+resp.hits.hits[i]._source.frages[j].lemmas[k].dbo.substring(0,120+"...");
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

        function generateVisualization(){

            var margin = {top: 30, right: 20, bottom: 30, left: 20},
            width = 960 - margin.left - margin.right,
            barHeight = 20,
            barWidth = width * 0.8;

            var i = 0,
            duration = 400;

            var tree = d3.layout.tree()
            .nodeSize([0, 20]);

            var diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

            var svg = d3.select("#chart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            update(root);

            function update(source) {

                source.x0 = 0;
                source.y0 = 0;

                // Compute the flattened node list
                var nodes = tree.nodes(root);

                var height = Math.max(500, nodes.length * barHeight + margin.top + margin.bottom);

                d3.select("svg").transition()
                .duration(duration)
                .attr("height", height);

                d3.select(self.frameElement).transition()
                .duration(duration)
                .style("height", height + "px");

                // Compute the "layout"
                nodes.forEach(function(n, i) {
                    n.x = i * barHeight;
                });

                // Update the nodes…
                var node = svg.selectAll("g.node")
                .data(nodes, function(d) { return d.id || (d.id = ++i); });

                var nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                .style("opacity", 1e-6);

                // Enter any new nodes at the parent's previous position.
                nodeEnter.append("rect")
                .attr("y", -barHeight / 2)
                .attr("height", barHeight)
                .attr("width", barWidth)
                .style("fill", color)
                .on("click", click);

                nodeEnter.append("text")
                .attr("dy", 3.5)
                .attr("dx", 5.5)
                .text(function(d) { return d.name; });

                // Transition nodes to their new position.
                nodeEnter.transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
                .style("opacity", 1);

                node.transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
                .style("opacity", 1)
                .select("rect")
                .style("fill", color);

                // Transition exiting nodes to the parent's new position.
                node.exit().transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
                .style("opacity", 1e-6)
                .remove();

                // Update the links…
                var link = svg.selectAll("path.link")
                .data(tree.links(nodes), function(d) { return d.target.id; });

                // Enter any new links at the parent's previous position.
                link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("d", function(d) {
                    var o = {x: source.x0, y: source.y0};
                    return diagonal({source: o, target: o});
                })
                .transition()
                .duration(duration)
                .attr("d", diagonal);

                // Transition links to their new position.
                link.transition()
                .duration(duration)
                .attr("d", diagonal);

                // Transition exiting nodes to the parent's new position.
                link.exit().transition()
                .duration(duration)
                .attr("d", function(d) {
                    var o = {x: source.x, y: source.y};
                    return diagonal({source: o, target: o});
                })
                .remove();

                // Stash the old positions for transition.
                nodes.forEach(function(d) {
                    d.x0 = d.x;
                    d.y0 = d.y;
                });
            }

            // Toggle children on click.
            function click(d) {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
                update(d);
            }

            function color(d) {
                return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
            }
        }
