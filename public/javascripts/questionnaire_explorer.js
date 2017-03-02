var mainExports = {};

(function() {

    // ELASTIC

    var ESToken = getCookie("token");

    var esClient = new $.es.Client({
        host: getESHost()
    });

    var indexName = 'tei-index';

    var svg = d3.select("#chordSVG"),
        width = +svg.attr("width"),
        height = +svg.attr("height"),
        outerRadius = Math.min(width, height) * 0.5 - 70,
        innerRadius = outerRadius - 30;


    var chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);

    var arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    var ribbon = d3.ribbon()
        .radius(innerRadius);

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    $('#questionnaireSelector').autocomplete({
        source: function (request, response) {

            esClient.search({
                index: indexName,
                type: 'exp-tei-type',
                headers: {
                    'Authorization' : "Bearer " + ESToken},
                size: 10000,
                body: {
                    "query": {
                        "match": {
                            "questionnaire": {
                                "query": request.term
                            }
                        }
                    },
                    "aggs": {
                        "questionnaires": {
                            "terms": {
                                "field": "questionnaire.keyword",
                                "min_doc_count": 50,
                                "order": {
                                    "_count": "desc"
                                }
                            }
                        }
                    }
                }
            }).then(function (resp) {
                console.log(resp);
                response(_.pluck(resp.aggregations.questionnaires.buckets, "key"));
               // response(_.uniq(resp.hits.aggs.senses, false, function (d) {
               //     return d._source.questionnaire;
               // }).slice(0, 9).map(function (d) {
               //     return d._source.questionnaire
               // }));
            })
        },
        minLength: 4
    });

    $("#questionnaireSelector").on( "autocompleteselect", function( event, ui ) {
        resetVis();
        esClient.search({
            index: indexName,
            type: 'tei-type',
            headers: {
                'Authorization' : "Bearer " + ESToken},
            size: 10000,
            body: {
                "size": 0,
                "query": {
                    "bool": {
                        "must": [
                            {
                                "query_string": {
                                    "analyze_wildcard": true,
                                    "query": "*"
                                }
                            },
                            {
                                "exists": {
                                    "field": "sense.keyword"
                                }
                            },
                            {
                                "exists": {
                                    "field": "fullLemma.keyword"
                                }
                            },
                            {
                                "match": {
                                    "questionnaire.keyword": {
                                        "query": ui.item.value,
                                        "type": "phrase"
                                    }
                                }
                            }
                        ],
                        "must_not": []
                    }
                },
                "_source": {
                    "excludes": []
                },
                "aggs": {
                    "senses": {
                        "terms": {
                            "field": "sense.keyword",
                            "size": 50,
                            "min_doc_count": 5,
                            "order": {
                                "_count": "desc"
                            }
                        },
                        "aggs": {
                            "lemmas": {
                                "terms": {
                                    "field": "fullLemma.keyword",
                                    "size": 1000,
                                    "order": {
                                        "_count": "desc"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }).then(respFunction);
    });



    //Word Cloud

    // Encapsulate the word cloud functionality
    function wordCloud(selector) {

        var fill = color;

        //Construct the word cloud's SVG element
        var svg = d3.select(selector).append("svg")
            .attr("width", 500)
            .attr("height", 500)
            .append("g")
            .attr("transform", "translate(250,250)");


        //Draw the word cloud
        function draw(words) {
            var cloud = svg.selectAll("g text")
                .data(words, function(d) { return d.text; });

            //Entering words
            cloud.enter()
                .append("text")
                .style("font-family", "Impact")
                .style("fill", function(d, i) { return fill(i); })
                .attr("text-anchor", "middle")
                .style('font-size', 1)
                .text(function(d) { return d.text; })
                .merge(cloud)
                .transition()
                .duration(600)
                .style("font-size", function(d) { return d.size + "px"; })
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })
                .style("fill-opacity", 1);

            //Entering and existing words
            // cloud


            //Exiting words
            cloud.exit()
                .transition()
                .duration(200)
                .style('fill-opacity', 1e-6)
                .style('font-size', 1)
                .remove();
        }


        //Use the module pattern to encapsulate the visualisation code. We'll
        // expose only the parts that need to be public.
        return {

            //Recompute the word cloud for a new set of words. This method will
            // asycnhronously call draw when the layout has been computed.
            //The outside world will need to call this function, so make it part
            // of the wordCloud return value.
            update: function(words) {
                d3.cloud().size([400, 400])
                    .words(words)
                    .padding(5)
                    .rotate(function() { return ~~(Math.random() * 2) * 90; })
                    .font("Impact")
                    .fontSize(function(d) { return d.size; })
                    .on("end", draw)
                    .start();
            }
        }

    }

    var resetVis = function () {

        svg.selectAll('*').remove();

        if (!!myWordCloud)
            myWordCloud.update([]);
    };


    var respFunction = function (resp) {
        var sensesAgg = resp.aggregations['senses'].buckets;
        console.log(resp);

        function zeros(dimensions) {
            var array = [];

            for (var i = 0; i < dimensions[0]; ++i) {
                array.push(dimensions.length == 1 ? 0 : zeros(dimensions.slice(1)));
            }

            return array;
        }

        var aMatrix = zeros([sensesAgg.length, sensesAgg.length]);


        console.log(sensesAgg);


        var senses = [];

        var sensesDict = {};

        for (var i = 0; i < sensesAgg.length; i++) {
            senses.push(sensesAgg[i].key);
            var lemmas = sensesAgg[i].lemmas.buckets;
            sensesDict[sensesAgg[i].key] = lemmas;
            for (var j = 0; j < lemmas.length; j++) {
                var aLemma = lemmas[j].key;
                var aDocCount = lemmas[j].doc_count;
                var isUnique = true;
                for (var k = sensesAgg.length - 1; k >= 0; k--) {
                    if (k == i) continue;
                    var secLemmas = sensesAgg[k].lemmas.buckets;
                    _.forEach(secLemmas, function (secLemmaAgg) {
                        var secLemma = secLemmaAgg.key;
                        var secDocCount = secLemmaAgg.doc_count;
                        if (secLemma === aLemma) {
                            isUnique = false;
                            if (secDocCount >= aDocCount) aMatrix[k][i] += 1;
                            else aMatrix[i][k] += 1;
                        }
                    })
                }
                if (isUnique) aMatrix[i][i] += 1;
            }
        }

        console.log(aMatrix);


        var g = svg.append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
            .datum(chord(aMatrix));

        var group = g.append("g")
            .attr("class", "groups")
            .selectAll("g")
            .data(function(chords) { return chords.groups; })
            .enter().append("g");

        group.append("path")
            .style("fill", function(d) { return color(d.index); })
            .style("stroke", function(d) { return d3.rgb(color(d.index)).darker(); })
            .attr("d", arc)
            .on("mouseover", fade(.1))
            .on("mouseout", fade(1))
            .on("click", function (d) {

                var lemmas = sensesDict[senses[d.index]];

                var size = d3.scaleLinear()
                    .domain([0, d3.max(_.pluck(lemmas,"doc_count"))])
                    .range([20, 60]);


                myWordCloud.update(lemmas.map(function (c) {
                    return {text: c.key, size: size(c.doc_count)};
                }));
                // myWordCloud.update(getWords(i ++ % words.length))
            });


        var groupTick = group.selectAll(".group-tick")
            .data(function(d) { return groupTicks(d, 1e3, senses); })
            .enter().append("g")
            .attr("class", "group-tick")
            .attr("transform", function(d) { return "rotate(" + (d.angle * 180 / Math.PI - 90) + ") translate(" + outerRadius + ",0)"; });

        groupTick.append("line")
            .attr("x2", 6);

        groupTick
        // .filter(function(d) { return d.value % 5e3 === 0; })
            .append("text")
            .attr("x", 8)
            .attr("dy", ".35em")
            .attr("transform", function(d) { return d.angle > Math.PI ? "rotate(180) translate(-16)" : null; })
            .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
            .text(function(d) { return d.value; });

        g.append("g")
            .attr("class", "ribbons")
            .selectAll("path")
            .data(function(chords) { return chords; })
            .enter().append("path")
            .attr("d", ribbon)
            .style("fill", function(d) { return color(d.target.index); })
            .style("stroke", function(d) { return d3.rgb(color(d.target.index)).darker(); });


    };

//Create a new instance of the word cloud visualisation.
    var myWordCloud = wordCloud('#chart');





    function fade(opacity) {
        return function(g, i) {
            svg.selectAll(".ribbons path")
                .filter(function(d) { return d.source.index != i && d.target.index != i; })
                .transition()
                .style("opacity", opacity);
        };
    }

// Returns an array of tick angles and values for a given group and step.
    function groupTicks(d, step, senses) {
        var k = (d.endAngle - d.startAngle) / d.value;
        return d3.range(0, d.value, step).map(function(value) {
            return {value: senses[d.index], angle: value * k + d.startAngle};
        });
    }

})();
