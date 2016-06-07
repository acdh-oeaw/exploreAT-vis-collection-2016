(function () {
    var force = null,
        color = null,
        labelSize = null,
        svg = null,
        width,
        height,
        domElement,
        _currentNode = null,
        _needsFiltering = false,
        filterLevel = 0,
        originalNodes,
        originalLinks,
        originalNest,
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
            .gravity(.1)
            .charge(function (d) { return -100 * d.weight})
            .linkDistance(80)
            .size([bbox.width, bbox.height]);

        d3.select(domElement).append("select")
            .attr("id", "population-select");


        svg = d3.select(domElement).append("svg")
            .attr("width", '100%')
            .attr("height", '100%')
            .call(zoom)
            .append("g")
            .style("pointer-events", "all");
        
        _currentNode   = null;
        _needsFiltering = true;

        force.on("tick", function() {
            svg.selectAll(".link").attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            svg.selectAll("g.node")
                .attr("transform", function (d) {
                    return "translate("+d.x+","+d.y+")";
                });

            var pathSelection = svg.selectAll("path").data(nest, function (d) {return d.key});

            pathSelection.enter().insert("path", "g")
                .style("stroke-width", function (d) {
                    return 40 * zoom.scale();
                })
                .style("stroke-linejoin", "round")
                .style("opacity", .2)
                .attr("d", groupPath);

            pathSelection
                .attr("d", groupPath)
                .style("stroke-width", function (d) {
                    return 40 * zoom.scale();
                })
                .style("fill", groupFill)
                .style("stroke", groupFill);


            svg.selectAll("path")
                .data(nest)
                .exit()
                .remove();


        });
        
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

            var theNodes = originalNodes;
            var theLinks = originalLinks;

            var relevantNodes = _.filter(theNodes, function (node) {
                return _.findWhere(communities, {id: node.community})
                        .population >= filterLevel;
            });

            var relevantLinks = _.filter(theLinks, function (link) {
                return _.indexOf(relevantNodes, link.source) > -1 &&
                        _.indexOf(relevantNodes, link.target) > -1;
            });

            var relevantNest = _.filter(originalNest, function (n) {
                var community = _.findWhere(communities, {id: parseInt(n.key)});
                return community.population >= filterLevel;
            });

            // _needsFiltering = false;

            _needsFiltering = false;

            return [relevantNodes, relevantLinks, relevantNest];
        };

        lemmaGraph.nodes = function (someNodes) {
            if (!arguments.length) return originalNodes;
            originalNodes = someNodes;
            console.log('Will represent ' + someNodes.length + ' nodes');
            originalNest = d3.nest()
                .key(function(d) { return d.community; })
                .entries(originalNodes);
            return lemmaGraph;
        };

        lemmaGraph.links = function (someLinks) {
            if (!arguments.length) return originalLinks;

            originalLinks = _.map(someLinks, function (d) {
                return {
                    "source" : originalNodes[d.source],
                    "target" : originalNodes[d.target],
                    "weight" : d.weight
                }
            });

            linkWeightScale = d3.scale.linear()
                .domain(d3.extent(originalLinks, function (d) { return d.weight}))
                .range([1,4]);
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

            // filterLevel = Math.round((popMinMax[1] + popMinMax[0]) / 2);

            var list = _.chain(communities).map(function(d){ return d.population}).uniq().value().sort(function (a,b){return a-b;});

            var avg = 0;

            _.forEach(list, function (el) {
                avg += el;
            });

            avg = avg/list.length;

            var getClosestValues = function(a, x) {
                var lo, hi;
                for (var i = a.length; i--;) {
                    if (a[i] <= x && (lo === undefined || lo < a[i])) lo = a[i];
                    if (a[i] >= x && (hi === undefined || hi > a[i])) hi = a[i];
                };
                return [lo, hi];
            };

            filterLevel = getClosestValues(list, avg)[1];

            var select = d3.select('#population-select');

            _.forEach(list, function (el, idx) {
                var opt = select.append('option')
                            .attr('value', el);
                if (el == filterLevel) {
                    console.log('filterLevel is ' + filterLevel);
                    opt.attr('selected', true);
                }
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

            if (!labelSize) {
                labelSize = d3.scale.log().base(Math.E).domain(d3.extent(originalNodes, function (d) { return d.weight;})).range([10,80]);
            }

            var data_nodes,
                data_links,
                currentNest;

            if (_needsFiltering) {
                var result = filterNetwork();
                data_nodes = result[0];
                data_links = result[1];
                currentNest = nest = result[2];

            } else {
                data_nodes = force.nodes();
                data_links = force.links();
                currentNest = nest;
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
                .remove();

            var nodeSelection = svg.selectAll("g.node").data(data_nodes, function (d) {return d.name});


            var nodeEnter = nodeSelection.enter()
                .append("g")
                .attr("class", "node")
                .call(force.drag());


            // nodeEnter.append("circle")
            //     .attr("r", function (d) {
            //         return  d.weight;
            //     })
            //     .style("fill", function(d) { return color(d.community); })
            //     .style("stroke", function(d) {
            //         return color(d.community); })
            //     .style("stroke-width", "1px");

            nodeEnter.append("text")
                .style("text-anchor", "middle")
                .style("stroke", function(d) { return d3.rgb(color(d.community)).darker(1); })
                .style("stroke-width", "0.5px")
                .style("font-size", function (d) { return labelSize(d.weight)+'px';})
                // .attr("y", 15)
                .text(function(d) {return d.name;});

            nodeEnter.append("title")
                .text(function(d) { return d.community });


            nodeEnter.on("mouseover", function(d) {})
                .on("mousedown", function(d) { d3.event.stopPropagation();})
                .on("mouseout", function(d) {}	);

            nodeSelection
                .exit()
                .remove();


            force
                .nodes(data_nodes)
                .links(data_links)
                .start();

            force.tick();

        };

        return lemmaGraph;
    };

    d3.lemmaGraph = lemmaGraph;

})();
