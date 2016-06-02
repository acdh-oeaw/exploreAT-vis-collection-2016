(function () {
    var force = null,
        color = d3.scale.category20(),
        svg = null,
        width,
        height,
        domElement,
        _currentNode = null,
        _needsFiltering = false,
        filterLevel = 0,
        nodes,
        links,
        nest,
        communities,
        linkWeightScale;

    var lemmaGraph = function (theDomElement) {
        domElement = theDomElement;
        var min_zoom = 0.1;
        var max_zoom = 7;
        var zoom = d3.behavior.zoom().scaleExtent([min_zoom,max_zoom])
            .on("zoom", function () {
                svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                svg.selectAll("path")
                    .style("stroke-width", function (d) {
                        return 40 * zoom.scale();
                    });
            });

        var selection = d3.select(domElement);
        var bbox = selection.node().getBoundingClientRect();

        color = d3.scale.category20();
        force  = d3.layout.force()
            .gravity(.05)
            .charge(-50)
            .linkDistance(50)
            .size([bbox.width, bbox.height]);

        d3.select(domElement).append("select")
            .attr("id", "population-select");


        svg = d3.select(domElement).append("svg")
            .attr("width", '100%')
            .attr("height", '100%')
            .call(zoom)
            .append("g")
            .style("pointer-events", "all");

        _shouldCluster = false,
            _currentNode   = null;

        var groupFill = function (d) {
          return color(d.values[0].community)
        };

        var groupPath = function(d) {
            var points = [];
            var mapFn = function(i) { return [i.x, i.y]; };
            if (d.values.length <= 2)
                points = d.values.map(mapFn);
            else
                points = d3.geom.hull(d.values.map(mapFn));
            return "M" +
                    points
                    .join("L")
                + "Z";
        };

        var forceTick = function() {
            svg.selectAll(".link").attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            svg.selectAll("g.node")
                .attr("transform", function (d) {
                    return "translate("+d.x+","+d.y+")";
                });

            // svg.selectAll("path")
            //     .data(nest)
            //     .attr("d", groupPath)
            //     .enter().insert("path", "g")
            //     .style("fill", groupFill)
            //     .style("stroke", groupFill)
            //     .style("stroke-width", function (d) {
            //         return 40 * zoom.scale();
            //     })
            //     .style("stroke-linejoin", "round")
            //     .style("opacity", .2)
            //     .attr("d", groupPath);
            //
            // svg.selectAll("path")
            //     .style("stroke-width", function (d) {
            //         return 40 * zoom.scale();
            //     });

        };
        _needsFiltering = true;
        force.on("tick", forceTick);

        var pruneNodes = function(original_nodes){
            var nodes =[],q;

            //when the clustering is disable return all the proteins
            if (!_shouldCluster)
                return original_nodes;

            //get the current quadtree
            q = d3.geom.quadtree(original_nodes);
            q.depth = 0; // root
            q.quadrant="0";

            //Tag all the proteins to be hidden
            original_nodes.forEach(function(o, i) { o.toshow=false; });

            //To use in quadtree.visit, to select what to show.
            var what2show = function(node, x1, y1, x2, y2){
                //determine the depth of the children
                for (var i=0; i<4; i++) {
                    if (node.nodes[i]){
                        node.nodes[i].depth = node.depth+1;
                    }
                }
                if (node.leaf && node.point!=null) {
                    node.point.toshow = true; //tag the node to show if has reach a leaf
                }else{
                    node.cluster=null;
                    //takes the decision of going deeper into the tree
                    if (!shouldGoDeeper(node)){// && node.cluster==null){
                        //in case it is determined to stop at this node, it creates a new cluster in that node.
                        node.cluster= {
                            id: "Cluster_"+_nthCluster,
                            name: "cluster "+ (_nthCluster++),
                            nodes:[],
                            isCluster: true,
                            px: x1,
                            py: y1,
                            size: 1,
                            weight: 1,
                            x: x1,
                            y: y1,
                            fixed:false,
                            group:15
                        };
                        nodes.push(node.cluster);
                        return true;
                    }
                }
                return false;
            };

            //To use in quadtree.visit, to find the cluster that a protein belongs to.
            var addCurrentNodeToCluster = function(node, x1, y1, x2, y2){
                if (_currentNode==null)
                    return true;
                if (x1<=_currentNode.x && _currentNode.x<=x2 && y1<=_currentNode.y && _currentNode.y<=y2){
                    if (node.cluster != null){
                        node.cluster.nodes.push(_currentNode);
                        _currentNode.cluster=node.cluster;
                        return true;
                    }
                    return !!node.leaf;
                }
                return true;
            };

            //goes trhought the tree marking what to show and creating clusters.
            q.visit(what2show);

            //Goes through all the proteins to include the ones to show in the nodes array() or to find its cluster
            original_nodes.forEach(function(o, i) {
                if (o.toshow){
                    nodes.push(o);
                }else{
                    _currentNode=o;
                    _currentNode.cluster=null;
                    q.visit(addCurrentNodeToCluster);
                    calculateCentroid(_currentNode.cluster);
                    _currentNode=null;
                }
            });

            return nodes;
        };

        var shouldGoDeeper = function(node){
            return _howDeep > node.depth;
        };

        var calculateCentroid = function(cluster){
            var centroid ={x:0,y:0};
            cluster.nodes.forEach(function(p,i){
                centroid.x +=p.px;
                centroid.y +=p.py;
            });
            cluster.px=cluster.x= centroid.x/cluster.nodes.length;
            cluster.py=cluster.y= centroid.y/cluster.nodes.length;
        };

        var pruneLinks= function(original_links){
            var links =[];
            if (!_shouldCluster)
                return original_links;
            original_links.forEach(function(o, i) {
                if (o.source.toshow){
                    if (o.target.toshow){
                        links.push(o);
                    }else{
                        links.push({
                            source: o.source,
                            target: o.target.cluster
                        });
                    }
                }else{
                    if (o.target.toshow){
                        links.push({
                            source: o.source.cluster,
                            target: o.target
                        });
                    }else{
                        if (o.source.cluster.id != o.target.cluster.id)
                            links.push({
                                source: o.source.cluster,
                                target: o.target.cluster
                            });
                    }
                }
            });
            return links;
        };

        var filterNetwork = function () {

            var theNodes = force.nodes();
            var theLinks = force.links();

            var relevantNodes = _.filter(theNodes, function (node) {
                return _.findWhere(communities, {id: node.community})
                        .population >= filterLevel;
            });

            var relevantLinks = _.filter(theLinks, function (link) {
                return _.indexOf(relevantNodes, link.source) > -1 &&
                        _.indexOf(relevantNodes, link.target) > -1;
            });

            // var filteredNest = _.filter(nest, function (n) {
            //     var community = _.findWhere(communities, {id: parseInt(n.key)});
            //     if(community == undefined)
            //         console.log('Stop');
            //     return community.population >= filterLevel;
            // });

            // nest = filteredNest;



            // _needsFiltering = false;

            _needsFiltering = false;

            return [relevantNodes, relevantLinks];
        };

        lemmaGraph.nodes = function (someNodes) {
            if (!arguments.length) return nodes;
            nodes = someNodes;
            nest = d3.nest()
                .key(function(d) { return d.community; })
                .entries(nodes);
            return lemmaGraph;
        };

        lemmaGraph.links = function (someLinks) {
            if (!arguments.length) return links;
            linkWeightScale = d3.scale.linear()
                .domain(d3.extent(someLinks, function (d) { return d.weight}))
                .range([1,4]);
            links = someLinks;
            return lemmaGraph;
        };

        lemmaGraph.communities = function (someCommunities) {
            if (!arguments.length) return communities;
            communities = someCommunities;
            _.forEach(communities, function (com) {
                console.log('Community ' + com.id + ' has ' + com.population + ' members');
            });

            var popMinMax = d3.extent(someCommunities, function (d) { return d.population});

            console.log('Max and min community populations: ' + popMinMax[1] + ' ' + popMinMax[0]);

            var populationAvg = Math.round((popMinMax[1] + popMinMax[0]) / 2);
            filterLevel = populationAvg;

            var list = _.chain(communities).map(function(d){ return d.population}).uniq().value().sort(function (a,b){return a-b;});

            var select = d3.select('#population-select');
            var midVal = list[Math.round(list.length / 2)];

            _.forEach(list, function (el, idx) {
                var opt = select.append('option')
                            .attr('value', el);
                if (el == midVal)
                    opt.attr('selected', true);
                opt.html(el + ' members');
            });

            select.on("change", function() {
                filterLevel = parseInt(this.value);
                console.log('Will filter with value ' + filterLevel);
                _needsFiltering = true;
                lemmaGraph.update();
            });


            return lemmaGraph;
        };

        lemmaGraph.update = function(){

            force.stop();

            force
                .nodes(nodes)
                .links(links)
                .start();

            var data_nodes,
                data_links;

            if (_needsFiltering) {
                var result = filterNetwork();
                data_nodes = result[0];
                data_links = result[1];
            } else {
                data_nodes = force.nodes();
                data_links = force.links();
            }



            var linkSelection = svg.selectAll("line.link")
                .data(data_links, function (d) {return d.source.name + "-" + d.target.name});
            linkSelection
                .enter()
                .append("line")
                .attr("class", "link")
                .style("stroke-width", function(d) {
                    return linkWeightScale(d.weight);
                })
                .style("stroke", function(d) {
                    return d3.scale.linear().range([color(d.source.community), color(d.target.community)])
                        .interpolate(d3.interpolateHcl)(d.source.weight / (d.source.weight + d.target.weight));
                });

            linkSelection
                .exit()
                .transition()
                .duration(2000)
                .style("opacity", 0)
                .remove();

            var nodeSelection = svg.selectAll("g.node").data(data_nodes, function (d) {return d.name});


            var nodeEnter = nodeSelection.enter()
                .append("g")
                .attr("class", "node")
                .call(force.drag());


            nodeEnter.append("text")
                .style("text-anchor", "middle")
                .style("stroke", function(d) { return color(d.community); })
                .style("stroke-width", "0.5px")
                .attr("y", 15)
                .text(function(d) {return d.name;});

            nodeEnter.append("title")
                .text(function(d) { return d.community });

            nodeEnter.append("circle")
                .attr("r", function (d) {
                    return  d.weight;
                })
                .style("fill", function(d) { return color(d.community); })
                .style("stroke", function(d) {
                    return color(d.community); })
                .style("stroke-width", "1px");


            nodeEnter.on("mouseover", function(d) {})
                .on("mousedown", function(d) { d3.event.stopPropagation();})
                .on("mouseout", function(d) {}	);

            nodeSelection.exit()
                .transition()
                .duration(2000)
                .style("opacity", 0)
                .remove();




            // svg.selectAll("path")
            //     .data(nest)
            //     .exit()
            //     .transition()
            //     .duration(2000)
            //     .style("opacity", 0)
            //     .remove();

        };
        return lemmaGraph;
    };

    d3.lemmaGraph = lemmaGraph;

})();


/*var allowedIndexes = [];

 var filteredNodes = _.filter(nodes, function (node, idx) {
 if (node.relationships > 1) {
 allowedIndexes.push(idx);
 return true;
 } else return false;
 });

 var filteredLinks = _.filter(links, function (link) {
 return _.indexOf(allowedIndexes, link.source) !== -1 &&
 _.indexOf(allowedIndexes, link.target) !== -1;
 }).map(function(link) {
 link.source = _.indexOf(allowedIndexes, link.source);
 link.target = _.indexOf(allowedIndexes, link.target);
 return link;
 });*/
