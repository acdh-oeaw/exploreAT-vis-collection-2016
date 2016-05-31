(function () {
    var force = null,
        color = d3.scale.category20(),
        svg = null,
        width,
        height,
        _shouldCluster = false,
        _currentNode = null,
        _howDeep = 2,
        _nthCluster = 0,
        nodes,
        links,
        communities;

    var lemmaGraph = function (domElement) {
        "use strict";
        var min_zoom = 0.1;
        var max_zoom = 7;
        var zoom = d3.behavior.zoom().scaleExtent([min_zoom,max_zoom]).on("zoom", function () {
            svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        });


        // var drag = d3.behavior.drag()
        //     .origin(function(d) { return d; })
        //     .on("dragstart", function () {
        //         d3.event.sourceEvent.stopPropagation();
        //     })
        //     .on("drag", function () {
        //         svg.attr("x", d.x = d3.event.x).attr("y", d.y = d3.event.y);
        //     })
        //     .on("dragend", function () {
        //
        //     });

        var selection = d3.select(domElement);
        var bbox = selection.node().getBoundingClientRect();

        color = d3.scale.category20();
        force  = d3.layout.force()
            .charge(-20)
            .linkDistance(30)
            .size([bbox.width, bbox.height]);

        d3.select(domElement).append("input")
            .attr("id", "cluster_slider")
            .attr("type", "range")
            .attr("min", 1)
            .attr("max", 5)
            .attr("value", 5)
            .on("change", function() {
                _shouldCluster=true;
                _howDeep=+this.value;
                lemmaGraph.update();
            });


        svg = d3.select(domElement).append("svg")
            .attr("width", '100%')
            .attr("height", '100%')
            .call(zoom)
            .append("g")
            .style("pointer-events", "all");

        _shouldCluster = false,
            _currentNode   = null,
            _howDeep       = 2,
            _nthCluster    = 0;

        force.on("tick", function() {
            svg.selectAll(".link").attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            svg.selectAll(".node").attr("cx", function(d) {
                return d.x;
            })
                .attr("cy", function(d) { return d.y; });

            svg.selectAll(".label").attr("x", function(d) { return d.x; })
                .attr("y", function(d) { return d.y - 10; });

        });

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

        lemmaGraph.nodes = function (someNodes) {
            if (!arguments.length) return nodes;
            nodes = someNodes;
            return lemmaGraph;
        };

        lemmaGraph.links = function (someLinks) {
            if (!arguments.length) return links;
            links = someLinks;
            return lemmaGraph;
        };

        lemmaGraph.communities = function (someCommunities) {
            if (!arguments.length) return communities;
            communities = someCommunities;
            _.forEach(communities, function (com) {
                console.log('Community ' + com.id + ' has ' + com.population + ' members');
            });
            return lemmaGraph;
        };

        lemmaGraph.update = function(){
            var data_nodes = pruneNodes(nodes),
                data_links = pruneLinks(links);

            force
                .nodes(data_nodes)
                .links(data_links)
                .start();

            var theLinks = svg.selectAll(".link")
                .data(data_links);
            var link =theLinks
                .enter().append("line")
                .attr("class", "link")
                .style("stroke-width", function(d) { return Math.sqrt(d.value); });

            theLinks.exit().remove();

            var theNodes = svg.selectAll(".node")
                .data(data_nodes);
            var node = theNodes
                .enter().append("circle")
                .attr("class", "node")
                .call(force.drag);

            node.on("mouseover", function(d) {
            })
                .on("mousedown", function(d) { d3.event.stopPropagation();

                }	).on("mouseout", function(d) {
            }	);

            var theLabels = svg.selectAll(".label")
                .data(data_nodes)
                .text(function(d) {
                    return d.name;
                });

            var label = theLabels.enter()
                .append("text")
                .attr("class", "label")
                .text(function(d) {
                    return d.name;
                });

            theLabels.exit().remove();

            theNodes.attr("r", function(d) {
                return 4* Math.sqrt((d.isCluster)?d.nodes.length:1);
            }).style("fill", function(d) { return color(d.community); });

            node.append("title")
                .text(function(d) { return d.community });

            theNodes.exit().remove();
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
