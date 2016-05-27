var cartoMap;
(function() {

    // ELASTIC

    var esClient = new $.es.Client({
        hosts: "http:\/\/localhost:9200\/"
    });

    // CROSSFILTER SHARED DATA

    var ndx; // crossfilter handle
    var tustepData = [];
    var timelineChart = dc.barChart('#timeline');

    var allDim, yearDim;
    var groupOfDocsPerYear;
    var minYear, maxYear;
    var selectedMinYear, selectedMaxYear;
    // var timelineYaxisNeedsUpdate = false;

    var minDocCount, maxDocCount, docCountMean;
    var minDocCountOverall, maxDocCountOverall, docCountMeanOverall;

    // LEMMA SEARCH VARIABLES

    var filterMain, filterLeft;
    var treeRootLemma = "";

    $("#livesearch-holder > form > input")
    .on("input", function() {
        update();
    });

    $("#lemma-and-or-selector").change(function(){
        update();
    });

    filterMain = $("#filterMain");
    filterLeft = $("#filterLeft");

    // MAP VARIABLES + INITIALIZATION

    var bucketResolution = 7;
    var yearResolution = 1;
    var svg,
    geoFeaturesLayer,
    geoGridLayer,
    geohashBuckets;
    var zoomDelay = 2000;

    cartoMap = d3.carto.map();
    d3.select("#map").call(cartoMap);

    // LEFT + BOTTOM PANELS HANDLERS

    $('#closeLeft').click(function(e) {
        w2ui['content'].toggle('left');
        setTimeout(function () {
            cartoMap.refresh();
        }, 1000)
    });

    var closeBottom = $('<div id="closeBottom" class="closer"></div>').appendTo('div#content>div');
    closeBottom.click(function(e) {
        w2ui['content'].toggle('bottom');
        setTimeout(function () {
            cartoMap.refresh();
        }, 1000)
    });

    // ZOOM CONTROLS HANDLER

    $('.zoomcontrol').bind('click', function() {
        console.log(cartoMap.projection());
        var projection = cartoMap.projection();
        console.log(JSON.stringify(projection.invert(40, 10)));
        console.log(JSON.stringify(cartoMap.zoom().translate()));
    });

    // TILES + COUNTRY BORDERS + GRID BASE

    var terrainLayer = d3.carto.layer.tile();
    terrainLayer
    .path('toner-lite')
    .tileType("stamen")
    .label("Map Tiles");

    var geojsonLayer = d3.carto.layer.geojson();
    geojsonLayer
    .path("data/austria.json")
    .label("Country Borders")
    .visibility(true)
    .cssClass("countryborders")
    .renderMode("svg");

    geoGridLayer = d3.carto.layer.featureArray().label("Bucket Grid")
    .cssClass("bucketGrid")
    .features([])
    .renderMode("svg");

    cartoMap.addCartoLayer(terrainLayer);
    cartoMap.addCartoLayer(geojsonLayer);
    cartoMap.addCartoLayer(geoGridLayer);

    var originalCenterCoords = [13.333333, 47.333333];
    var originalBBox;
    cartoMap.setScale(5);
    cartoMap.centerOn(originalCenterCoords,"latlong");

    // GEO BUCKETS SCALE/PRECISION CONTROL

    $("#bucket-resolution-selector").change(function() {
        bucketResolution = parseInt($("#bucket-resolution-selector option:selected").val());
        update();
    });

    // TOOLTIP SHOW CONTROL INITIAL ACTIVATION
    $('#tooltip-checkbox').val($(this).is(':checked'));

    // LEMMA LIST HANDLE

    $("#lemma-list-handle").on("click", function() {
        showHideLemmaList();
    });

    // MAP TOOLTIP

    var tooltip = $('#tooltip');
    tooltip.hide();
    $(document).mousemove(function(e){
        var tooltipW = 150, tooltipH = 150;
        tooltip.css({'top': e.pageY - tooltip.height()/2,'left': e.pageX - tooltip.width()/2});
    });

    // APP START (First update)

    update();

    function update() {
        getDataFromElastic()
        .then(function(resp) {
            if (resp.aggregations.length !== 0) {
                createDataStructure(resp);
                if(tustepData.length > 0) {
                    refreshCrossfilter();
                    refreshGridFeatures();
                    refreshGeoFeatures();
                }
                else {
                    console.log("no results")
                    // Clear the timeline
                    timelineChart.selectAll("rect.bar").remove();

                    // No geofeatures == remove layer
                    geoFeaturesLayer
                    .features([]);
                    //.clickableFeatures(true);
                    cartoMap.refreshCartoLayer(geoFeaturesLayer);

                    // Update counters to show no data was found
                    $("#timeline-lemma-count").html(0);
                }
            }
        });
    }

    function createDataStructure(resp) {

        tustepData = [];
        geohashBuckets = resp.aggregations.ortMain.buckets;

        geohashBuckets.forEach(function(bucket){
            bucket.years.buckets.forEach(function(year){
                tustepData.push({"hash":bucket.key, "year":year.key_as_string, "docs":year.doc_count});
            });
        });

        // console.log("TUSTEPDATA");

        minYear = _.min(tustepData, function(reg){return parseInt(reg.year);}).year;
        maxYear = _.max(tustepData, function(reg){return parseInt(reg.year);}).year;
    }

    function refreshCrossfilter(){

        if(ndx == null){
            ndx = crossfilter(tustepData);

            if(yearDim == null || yearDim == undefined)
            yearDim = ndx.dimension(dc.pluck('year'));
            // hashDim = ndx.dimension(dc.pluck('hash')),
            // docCountDim = ndx.dimension(dc.pluck('docs')),
            // allDim = ndx.dimension(function(d) {return d;});

            // var countPerYear = yearDim.group().reduceCount(),
            // countPerDocCount = yearDim.group().reduceSum(function(d) {return d.docs;});
            // var all = ndx.groupAll();
            groupOfDocsPerYear = yearDim.group();

            var reducer = reductio()
            // .count(true)
            // .avg(true)
            .sum(function(d) { return d.docs; });
            reducer(groupOfDocsPerYear);

            appendTimeline();
            // timelineYaxisNeedsUpdate = true; // Update the scale for the first time
        }
        else{
            resetCrossfilterData();
        }
    }

    function resetCrossfilterData() {
        var timelineFilters = timelineChart.filters();
        timelineChart.filter(null);
        ndx.remove();
        //timelineChart.filter([timelineFilters]);
        ndx.add(tustepData);
        timelineChart.filterAll();
        dc.redrawAll();

        resetTimelineColor();

        // timelineYaxisNeedsUpdate = true; // Update only once when the data changes (new docCounts)
    }

    function appendTimeline(){

        var margins = {top: 10, right: 60, bottom: 40, left: 60};
        timelineChart
        .width(parseInt(d3.select('#timeline-holder').style('width'), 10))
        .height(100)
        .dimension(yearDim)
        .group(groupOfDocsPerYear)
        .valueAccessor(function(p) { return p.value.sum; })
        .x(d3.scale.linear().domain([
            yearDim.top(Infinity)[yearDim.top(Infinity).length-1].year, // minYear
            yearDim.top(Infinity)[0].year // maxYear
        ]))
        .centerBar(true)
        .margins(margins);
        timelineChart.xAxis().tickValues(_.unique(_.pluck(yearDim.top(Infinity),"year")).sort().filter(function(el, index) {return index % 10 === 1;}));
        //timelineChart.yAxis().tickValues(0);

        timelineChart.on("preRedraw", function (chart) {
            chart.rescale();
        });
        timelineChart.on("preRender", function (chart) {
            chart.rescale();
        });

        // Update the map after any brushing action
        timelineChart.on('filtered', function () {
            refreshGeoFeatures();
            timelineChart.selectAll('g.x text')
            .attr('transform', 'translate(-10,10) rotate(315)');
        });

        // Reset == Remove filters and redraw
        d3.selectAll('a#timeline-reset').on('click', function () {
            timelineChart.filterAll();
            dc.redrawAll();
        });

        // Set the timeline resolution change listener
        $("#timeline-resolution-selector").change(function() {
            yearResolution = parseInt($("#timeline-resolution-selector option:selected").val());
            update();
        });

        // Draw all for the first time
        dc.renderAll();
        resetCrossfilterData();
    }

    function updateTimelineInfoLabels(geoFeatures){

        // Year labels

        if(timelineChart.filters()[0] != undefined){
            selectedMinYear = parseInt(timelineChart.filters()[0][0]);
            selectedMaxYear = parseInt(timelineChart.filters()[0][1]);
        } else{
            selectedMinYear = yearDim.top(Infinity)[yearDim.top(Infinity).length-1].year;
            selectedMaxYear = yearDim.top(Infinity)[0].year;
        }

        $("#timeline-filter-start").html(selectedMinYear);
        $("#timeline-filter-end").html(selectedMaxYear);

        // Lemma labels
        var totalLemmas = 0;
        _.forEach(geoFeatures, function(feature){
            totalLemmas += feature.properties.doc_count;
        });
        $("#timeline-lemma-count").html(totalLemmas);

        // console.log(yearDim.top(Infinity)[yearDim.top(Infinity).length-1].year); // minYear
        // console.log(yearDim.top(Infinity)[0].year); // maxYear

        timelineChart.x(d3.scale.linear().domain([minYear,maxYear]));

        var years = [];
        for(var i=parseInt(minYear)-1; i<=maxYear; i++){years.push(i);}
        if(yearResolution == 1){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
        else if(yearResolution == 5){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
        else if(yearResolution == 10){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
        else if(yearResolution == 25){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 25 === 1;}));}
        dc.redrawAll();
    }

    function updateTimelineYscale(geoFeatures){

        // Get min/mean/max docCounts and update the Y axis of the chart

        // This gets done only once per data update, so the chart remains the same
        // no matter if the user brushes it, until another dataset is loaded (detail changed)

        getMinMaxMeanDocCountsOverall();

        timelineChart.y(d3.scale.linear().domain([minDocCountOverall, maxDocCountOverall]));
        timelineChart.yAxis().tickValues([minDocCountOverall, maxDocCountOverall]);
        dc.redrawAll();

        // timelineYaxisNeedsUpdate = false;
    }

    function getMinMaxMeanDocCounts(geoFeatures){

        minDocCount = _.min(geoFeatures, function(el) {
            return el.properties.doc_count;
        }).properties.doc_count;

        docCountMean = d3.mean(geoFeatures, function (el) {
            return el.properties.doc_count;
        });

        maxDocCount = _.max(geoFeatures, function(el) {
            return el.properties.doc_count;
        }).properties.doc_count;
    }

    function getMinMaxMeanDocCountsOverall(){

        var newGeohashBuckets = [];
        var hashStringArray = _.unique(_.pluck(tustepData,"hash"));

        _.each(hashStringArray,function(hash){
            var entriesForHash = _.filter(tustepData, function(entry){
                return entry.hash == hash;
            });

            var geoObject = {};
            geoObject.key = hash;
            geoObject.doc_count = 0;
            _.each(entriesForHash, function(entry){
                geoObject.doc_count += parseInt(entry.docs);
            });

            if(geoObject.doc_count > 0)
            newGeohashBuckets.push(geoObject);
        });

        var geoFeaturesOverall = _.map(newGeohashBuckets, function (hash_bucket) {

            var geohashBounds = Geohash.bounds(hash_bucket.key);
            var swCoords = geohashBounds.sw;
            var neCoords = geohashBounds.ne;

            var polygonVertex = [[]];

            polygonVertex[0][0] = [swCoords.lon, neCoords.lat];
            polygonVertex[0][1] = [neCoords.lon, neCoords.lat];
            polygonVertex[0][2] = [neCoords.lon, swCoords.lat];
            polygonVertex[0][3] = [swCoords.lon, swCoords.lat];
            polygonVertex[0][4] = [swCoords.lon, neCoords.lat];

            return {
                "type": "Feature",
                "properties": {
                    "key": hash_bucket.key,
                    "doc_count": hash_bucket.doc_count
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": polygonVertex
                }
            };
        });

        minDocCountOverall = _.min(geoFeaturesOverall, function(el) {
            return el.properties.doc_count;
        }).properties.doc_count;

        docCountMeanOverall = d3.mean(geoFeaturesOverall, function (el) {
            return el.properties.doc_count;
        });

        maxDocCountOverall = _.max(geoFeaturesOverall, function(el) {
            return el.properties.doc_count;
        }).properties.doc_count;
    }

    function refreshGridFeatures(){
        getGridDataFromElastic()
        .then(function(resp) {

            var gridFeatures = generateGridFeatures(resp);

            if(originalBBox == null || originalBBox == undefined){
                var bounds = {};
                bounds.ne = gridFeatures[0].properties.bounds.ne;
                bounds.sw = gridFeatures[1].properties.bounds.sw;
                originalBBox = getBoundingBoxLatLon(bounds);
            }

            console.log(gridFeatures.length + " grid features")

            geoGridLayer
            .features(gridFeatures);
            cartoMap.refreshCartoLayer(geoGridLayer);
        });
    }

    function refreshGeoFeatures(){

        var geoFeatures = generateCrossGeoFeatures();

        // console.log("GEOFEATURES");

        if (geoFeatures && geoFeatures.length > 0) {

            getMinMaxMeanDocCounts(geoFeatures);

            function colorByCount(minDoc, mean, maxDoc) {
                mean = mean || docCountMean;
                minDoc = minDoc || minDocCount;
                maxDoc = maxDoc || maxDocCount;
                var colorScale = d3.scale.linear()
                .range(colorbrewer.Blues[3])
                .domain([minDoc, mean, maxDoc]);
                d3.selectAll("path.featureLayer")
                .style("fill", function (d) {
                    return colorScale(d.properties.doc_count);
                })
                .style("opacity", 0.8);
            }

            if (geoFeaturesLayer == undefined) {
                geoFeaturesLayer = d3.carto.layer.featureArray().label("Word Buckets")
                .cssClass("featureLayer")
                .features(geoFeatures)
                .renderMode("svg")
                .on("load", colorByCount);
                cartoMap.addCartoLayer(geoFeaturesLayer);
            } else {
                geoFeaturesLayer
                .features(geoFeatures);
                cartoMap.refreshCartoLayer(geoFeaturesLayer);
                if (geoFeatures.length > 0)
                colorByCount(minDocCount,docCountMean,maxDocCount);
            }

            bindGeoFeaturesActions(geoFeatures);

            // Update the lemma count
            updateTimelineInfoLabels(geoFeatures);
            // Update timeline Y axis scale
            updateTimelineYscale(geoFeatures);
        }
    }

    function bindGeoFeaturesActions(geoFeatures){
        var featureLayer = $("g.featureLayer");
        featureLayer.unbind('click');
        d3.selectAll("g.featureLayer").data(geoFeatures)
        .on("click",function(d,i){

            // Hide tooltip
            tooltip.hide();

            // Zoom and rise resolution
            if(bucketResolution < 11){
                resetTimelineColor();
                cartoMap.zoomTo(getBoundingBoxLatLon(d.properties.bounds),"latlong",.2,zoomDelay);
                setTimeout(
                    function() {
                        bucketResolution +=1;
                        $("#bucket-resolution-selector").val(bucketResolution);
                        update();
                    }, zoomDelay-850
                );
            }

            // Show lemmas contained in the bucket
            var lemmaListTable = $('#lemma-list-table');
            lemmaListTable.html("");

            getLemmasInGeoHashBucket(d.properties.key).then(function (resp) {

                //generateLemmaGraphFromAggregations(resp.aggregations);

                var wordBuckets = resp.aggregations.mainLemma.buckets;

                for(var i = 0; i<10/*d.doc_count*/; i++){
                    lemmaListTable.append(function(){
                        var html = '<div class="lemma-list-row">';
                        html += '<strong>'+(i+1)+'.</strong> <span class="lemma-list-word">'+wordBuckets[i].key+'</span>';
                        html += '<div class="lemma-list-actions">';
                        html += '<div class="lemma-button relations">Plot Relations</div>';
                        html += '<div class="lemma-button map">Plot in Map</div>';
                        html += '</div>';
                        html += '</div>';
                        return html;
                    });
                }

                // Lemma List Listeners

                d3.selectAll(".lemma-button.relations").data(wordBuckets)
                .on("click",function(lemmaBucket,i){
                    generateTreeGraphForLemma(lemmaBucket.key);
                    w2ui['content'].show('left');
                });

                d3.selectAll(".lemma-button.map").data(wordBuckets)
                .on("click",function(lemmaBucket,i){

                    $("#filterMain").val(lemmaBucket.key);
                    $("#filterLeft").val(lemmaBucket.key);
                    filterMain = $("#filterMain");
                    filterLeft = $("#filterLeft");
                    $("#lemma-and-or-selector").val("or");
                    update();
                    cartoMap.zoomTo(
                        [[originalBBox[0][0]+2,originalBBox[0][1]-.8],[originalBBox[1][0]+2,originalBBox[1][1]-.8]],
                        "latlong",1,zoomDelay
                    );
                });

                showHideLemmaList(true);
            });
        });
        featureLayer.unbind('mouseover');
        featureLayer.unbind('mouseout');
        d3.selectAll("g.featureLayer").data(geoFeatures)
        .on("mouseover",function(dFeature,i){

            // Only if the user wants to see the tooltip
            if($("#tooltip-checkbox").is(":checked")) {

                var featureCount = dFeature.properties.doc_count;
                var restCount = parseInt($("#timeline-lemma-count").html())-dFeature.properties.doc_count;

                tooltip.html(function(){
                    var html = '<div id="tooltip-lemma-counter">';
                    html += '<strong>'+featureCount+' lemmas</strong><br>'
                    html += 'out of <strong>'+(restCount+featureCount)+'</strong>';
                    html += '</div>';
                    return html;
                });

                // tooltip.css({
                //     'top': $(this).position().top - $(this).height()/2,
                //     'left': $(this).offset().left - $(this).width()/2,
                //     'width': $(this).width(),
                //     'height': $(this).height()
                // });

                var w = 24, h = 24, r = 12;
                var color = d3.scale.category20c();
                var color = d3.scale.ordinal()
                .domain([featureCount,restCount])
                .range(["#2b91fc", "#d6eaff"]);

                var data = [{"label":"Feature", "value":featureCount},
                {"label":"All", "value":restCount}];

                var vis = d3.select("#tooltip")
                .insert("svg:svg",":first-child")
                .data([data])
                .attr("class","vis")
                .attr("width", w)
                .attr("height", h)
                .append("svg:g")
                .attr("transform", "translate(" + r + "," + r + ")");
                var pie = d3.layout.pie().value(function(d){return d.value;});

                // declare an arc generator function
                var arc = d3.svg.arc().outerRadius(r);

                // select paths, use arc generator to draw
                var arcs = vis.selectAll("g.slice").data(pie).enter().append("svg:g").attr("class", "slice");
                arcs.append("svg:path")
                .attr("fill", function(d, i){
                    return color(i);
                })
                .attr("d", function (d) {
                    return arc(d);
                });

                tooltip.show();
            }

            // Highlight related years in timeline
            timelineChart.selectAll('rect.bar').each(function(dBar){
                if(dFeature.properties.years.indexOf(parseInt(dBar.x)) > -1){
                    d3.select(this).transition().duration(500).style("fill", "#2b91fc");
                }
                else {
                    d3.select(this).transition().duration(500).style("fill", "black");
                }
            });
        })
        .on("mouseout",function(dFeature,i){
            resetTimelineColor();
            tooltip.hide();
        });
    }

    function generateCrossGeoFeatures() {

        var newGeoHashBuckets = [];
        var hashStringArray = _.unique(_.pluck(yearDim.top(Infinity),"hash"));

        _.each(hashStringArray,function(hash){
            var entriesForHash = _.filter(yearDim.top(Infinity), function(entry){
                return entry.hash == hash;
            });

            var geoObject = {};
            geoObject.key = hash;
            geoObject.doc_count = 0;
            geoObject.years = [];

            geohashBuckets.forEach(function(bucket){
                if(bucket.key == hash && bucket.years != undefined){
                    bucket.years.buckets.forEach(function(yearBucket){
                        geoObject.years.push(parseInt(yearBucket.key_as_string));
                    });
                }
            });

            _.each(entriesForHash, function(entry){
                geoObject.doc_count += parseInt(entry.docs);
            });

            if(geoObject.doc_count > 0)
            newGeoHashBuckets.push(geoObject);
        });

        return _.map(newGeoHashBuckets, function (hash_bucket) {

            var geohashBounds = Geohash.bounds(hash_bucket.key);
            var swCoords = geohashBounds.sw;
            var neCoords = geohashBounds.ne;

            var polygonVertex = [[]];

            polygonVertex[0][0] = [swCoords.lon, neCoords.lat];
            polygonVertex[0][1] = [neCoords.lon, neCoords.lat];
            polygonVertex[0][2] = [neCoords.lon, swCoords.lat];
            polygonVertex[0][3] = [swCoords.lon, swCoords.lat];
            polygonVertex[0][4] = [swCoords.lon, neCoords.lat];

            return {
                "type": "Feature",
                "properties": {
                    "key": hash_bucket.key,
                    "doc_count": hash_bucket.doc_count,
                    "years": hash_bucket.years,
                    "bounds": geohashBounds
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": polygonVertex
                }
            };
        });
    }

    function generateGridFeatures(resp){

        var gridGeoHashBuckets = resp.aggregations.ortMain.buckets;

        return _.map(gridGeoHashBuckets, function (hash_bucket) {

            var geohashBounds = Geohash.bounds(hash_bucket.key);
            var swCoords = geohashBounds.sw;
            var neCoords = geohashBounds.ne;

            var polygonVertex = [[]];

            polygonVertex[0][0] = [swCoords.lon, neCoords.lat];
            polygonVertex[0][1] = [neCoords.lon, neCoords.lat];
            polygonVertex[0][2] = [neCoords.lon, swCoords.lat];
            polygonVertex[0][3] = [swCoords.lon, swCoords.lat];
            polygonVertex[0][4] = [swCoords.lon, neCoords.lat];

            return {
                "type": "Feature",
                "properties": {
                    "key": hash_bucket.key,
                    "bounds": geohashBounds
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": polygonVertex
                }
            };
        });
    }


    function generateLemmaGraphFromAggregations(resp_aggregations) {
        var nodes = [],
        links = [];

        _.forEach(resp_aggregations.mainLemma.buckets, function (bucket) {

            var minRelationships = 0, maxRelationShips = 0,
            minValue = 0, maxValue = 0;

            if (bucket.leftLemma.buckets.length == 0)
            return; //Skip

            var bucketIndex = _.findIndex(nodes, function (node) {
                return node.lemma == bucket.key;
            });
            if (bucketIndex == -1) {
                bucketIndex = nodes.push({
                    "lemma": bucket.key,
                    "relationships" : bucket.doc_count
                }) - 1;
            } else {
                nodes[bucketIndex].relationships += bucket.doc_count;
            }
            _.forEach(bucket.leftLemma.buckets, function (bucket_leftLemma) {
                var leftLemmaIndex = _.findIndex(nodes, function (node) {
                    return node.lemma == bucket_leftLemma.key;
                });
                if (leftLemmaIndex == -1) {
                    leftLemmaIndex = nodes.push({
                        "lemma": bucket_leftLemma.key,
                        "relationships": 1
                    }) - 1;

                } else {
                    nodes[leftLemmaIndex].relationships += 1;
                }
                var linkIndex = _.findIndex(links, function(link) {
                    return link.source == bucketIndex &&
                    link.target == leftLemmaIndex;
                });

                if (linkIndex !== -1) {
                    links[linkIndex].value += bucket_leftLemma.doc_count;
                } else {
                    links.push({
                        "source":   bucketIndex,
                        "target":   leftLemmaIndex,
                        "value":     bucket_leftLemma.doc_count
                    });
                }
            });
        });


        var force = d3.layout.force()
        .charge(-10)
        .linkDistance(5)
        .size([300, 600])
        .nodes(nodes).
        links(links)
        .start();

        $("#lemma-graph").html("");

        w2ui['content'].show('left');



        var svg = d3.select("#lemma-graph").append("svg")
        .attr("width", '100%')
        .attr("height", '100%');

        var link = svg.selectAll(".link")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke-width",1)
        .style("stroke","black");

        var node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", 3)
        .style("fill", "black")
        .call(force.drag);

        node.append("title")
        .text(function(d) { return d.lemma; });
        force.on("tick", function() {
            link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

            node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
        });

        console.log(resp_aggregations);
    }


    function generateTreeGraphForLemma(lemma){

        getAllRecordsForWord(lemma).then(function (resp) {

            var asLeftLemma = [];
            var asMainLemma = [];

            console.log(resp.hits.hits);

            _.forEach(resp.hits.hits,function(hit){
                if(lemma == hit._source.leftLemma){
                    var object = {};
                    object.word = hit._source.mainLemma;
                    object.type = "left";
                    asLeftLemma.push(object);
                }
                else if(lemma == hit._source.mainLemma){
                    var object = {};
                    object.word = hit._source.leftLemma;
                    object.type = "right";
                    asMainLemma.push(object);
                }
            });

            asLeftLemma = _.unique(asLeftLemma);
            asMainLemma = _.unique(asMainLemma);

            ////////

            var treeData = {
                "word" : lemma,
                "children" : []
            }

            _.forEach(asLeftLemma, function(hit){
                treeData.children.push(hit);
            });
            // _.forEach(asMainLemma, function(hit){
            //     treeData.children.push(hit);
            // });


            // Calculate total nodes, max label length
            var totalNodes = 0;
            var maxLabelLength = 0;
            // variables for drag/drop
            var selectedNode = null;
            var draggingNode = null;
            // panning variables
            var panSpeed = 200;
            var panBoundary = 20; // Within 20px from edges will pan when dragging.
            // Misc. variables
            var i = 0;
            var duration = 750;
            var root;

            // size of the diagram
            var viewerWidth = $("#lemma-graph").width();
            var viewerHeight = $("#lemma-graph").height();

            var tree = d3.layout.tree()
            .size([viewerHeight, viewerWidth]);

            // define a d3 diagonal projection for use by the node paths later on.
            var diagonal = d3.svg.diagonal()
            .projection(function(d) {
                return [d.y, d.x];
            });

            // A recursive helper function for performing some setup by walking through all nodes

            function visit(parent, visitFn, childrenFn) {
                if (!parent) return;

                visitFn(parent);

                var children = childrenFn(parent);
                if (children) {
                    var count = children.length;
                    for (var i = 0; i < count; i++) {
                        visit(children[i], visitFn, childrenFn);
                    }
                }
            }

            // Call visit function to establish maxLabelLength
            visit(treeData, function(d) {
                totalNodes++;
                maxLabelLength = Math.max(d.word.length, maxLabelLength);

            }, function(d) {
                return d.children && d.children.length > 0 ? d.children : null;
            });


            // sort the tree according to the node names

            function sortTree() {
                tree.sort(function(a, b) {
                    return b.word.toLowerCase() < a.word.toLowerCase() ? 1 : -1;
                });
            }
            // Sort the tree initially incase the JSON isn't in a sorted order.
            sortTree();

            // TODO: Pan function, can be better implemented.

            function pan(domNode, direction) {
                var speed = panSpeed;
                if (panTimer) {
                    clearTimeout(panTimer);
                    translateCoords = d3.transform(svgGroup.attr("transform"));
                    if (direction == 'left' || direction == 'right') {
                        translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
                        translateY = translateCoords.translate[1];
                    } else if (direction == 'up' || direction == 'down') {
                        translateX = translateCoords.translate[0];
                        translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
                    }
                    scaleX = translateCoords.scale[0];
                    scaleY = translateCoords.scale[1];
                    scale = zoomListener.scale();
                    svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
                    d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
                    zoomListener.scale(zoomListener.scale());
                    zoomListener.translate([translateX, translateY]);
                    panTimer = setTimeout(function() {
                        pan(domNode, speed, direction);
                    }, 50);
                }
            }

            // Define the zoom function for the zoomable tree

            function zoom() {
                svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            }


            // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
            var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

            function initiateDrag(d, domNode) {
                draggingNode = d;
                d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
                d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
                d3.select(domNode).attr('class', 'node activeDrag');

                svgGroup.selectAll("g.node").sort(function(a, b) { // select the parent and sort the path's
                if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
                else return -1; // a is the hovered element, bring "a" to the front
            });
            // if nodes has children, remove the links and nodes
            if (nodes.length > 1) {
                // remove link paths
                links = tree.links(nodes);
                nodePaths = svgGroup.selectAll("path.link")
                .data(links, function(d) {
                    return d.target.id;
                }).remove();
                // remove child nodes
                nodesExit = svgGroup.selectAll("g.node")
                .data(nodes, function(d) {
                    return d.id;
                }).filter(function(d, i) {
                    if (d.id == draggingNode.id) {
                        return false;
                    }
                    return true;
                }).remove();
            }

            // remove parent link
            parentLink = tree.links(tree.nodes(draggingNode.parent));
            svgGroup.selectAll('path.link').filter(function(d, i) {
                if (d.target.id == draggingNode.id) {
                    return true;
                }
                return false;
            }).remove();

            dragStarted = null;
        }

        // define the baseSvg, attaching a class for styling and the zoomListener
        var baseSvg = d3.select("#lemma-graph").append("svg")
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay")
        .call(zoomListener);


        // Define the drag listeners for drag/drop behaviour of nodes.
        dragListener = d3.behavior.drag()
        .on("dragstart", function(d) {
            if (d == root) {
                return;
            }
            dragStarted = true;
            nodes = tree.nodes(d);
            d3.event.sourceEvent.stopPropagation();
            // it's important that we suppress the mouseover event on the node being dragged. Otherwise it will absorb the mouseover event and the underlying node will not detect it d3.select(this).attr('pointer-events', 'none');
        })
        .on("drag", function(d) {
            if (d == root) {
                return;
            }
            if (dragStarted) {
                domNode = this;
                initiateDrag(d, domNode);
            }

            // get coords of mouseEvent relative to svg container to allow for panning
            relCoords = d3.mouse($('svg').get(0));
            if (relCoords[0] < panBoundary) {
                panTimer = true;
                pan(this, 'left');
            } else if (relCoords[0] > ($('svg').width() - panBoundary)) {

                panTimer = true;
                pan(this, 'right');
            } else if (relCoords[1] < panBoundary) {
                panTimer = true;
                pan(this, 'up');
            } else if (relCoords[1] > ($('svg').height() - panBoundary)) {
                panTimer = true;
                pan(this, 'down');
            } else {
                try {
                    clearTimeout(panTimer);
                } catch (e) {

                }
            }

            d.x0 += d3.event.dy;
            d.y0 += d3.event.dx;
            var node = d3.select(this);
            node.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
            updateTempConnector();
        }).on("dragend", function(d) {
            if (d == root) {
                return;
            }
            domNode = this;
            if (selectedNode) {
                // now remove the element from the parent, and insert it into the new elements children
                var index = draggingNode.parent.children.indexOf(draggingNode);
                if (index > -1) {
                    draggingNode.parent.children.splice(index, 1);
                }
                if (typeof selectedNode.children !== 'undefined' || typeof selectedNode._children !== 'undefined') {
                    if (typeof selectedNode.children !== 'undefined') {
                        selectedNode.children.push(draggingNode);
                    } else {
                        selectedNode._children.push(draggingNode);
                    }
                } else {
                    selectedNode.children = [];
                    selectedNode.children.push(draggingNode);
                }
                // Make sure that the node being added to is expanded so user can see added node is correctly moved
                expand(selectedNode);
                sortTree();
                endDrag();
            } else {
                endDrag();
            }
        });

        function endDrag() {
            selectedNode = null;
            d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
            d3.select(domNode).attr('class', 'node');
            // now restore the mouseover event or we won't be able to drag a 2nd time
            d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
            updateTempConnector();
            if (draggingNode !== null) {
                update(root);
                centerNode(draggingNode);
                draggingNode = null;
            }
        }

        // Helper functions for collapsing and expanding nodes.

        function collapse(d) {
            if (d.children) {
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }

        function expand(d) {
            if (d._children) {
                d.children = d._children;
                d.children.forEach(expand);
                d._children = null;
            }
        }

        var overCircle = function(d) {
            selectedNode = d;
            updateTempConnector();
        };
        var outCircle = function(d) {
            selectedNode = null;
            updateTempConnector();
        };

        // Function to update the temporary connector indicating dragging affiliation
        var updateTempConnector = function() {
            var data = [];
            if (draggingNode !== null && selectedNode !== null) {
                // have to flip the source coordinates since we did this for the existing connectors on the original tree
                data = [{
                    source: {
                        x: selectedNode.y0,
                        y: selectedNode.x0
                    },
                    target: {
                        x: draggingNode.y0,
                        y: draggingNode.x0
                    }
                }];
            }
            var link = svgGroup.selectAll(".templink").data(data);

            link.enter().append("path")
            .attr("class", "templink")
            .attr("d", d3.svg.diagonal())
            .attr('pointer-events', 'none');

            link.attr("d", d3.svg.diagonal());

            link.exit().remove();
        };

        // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

        function centerNode(source) {
            scale = zoomListener.scale();
            x = -source.y0;
            y = -source.x0;
            x = x * scale + viewerWidth / 2;
            y = y * scale + viewerHeight / 2;
            d3.select('g').transition()
            .duration(duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
            zoomListener.scale(scale);
            zoomListener.translate([x, y]);
        }

        // Toggle children function

        function toggleChildren(d) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else if (d._children) {
                d.children = d._children;
                d._children = null;
            }
            return d;
        }

        // Toggle children on click.

        function click(d) {
            if (d3.event.defaultPrevented) return; // click suppressed
            d = toggleChildren(d);
            update(d);
            centerNode(d);
        }

        function update(source) {
            // Compute the new height, function counts total children of root node and sets tree height accordingly.
            // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
            // This makes the layout more consistent.
            var levelWidth = [1];
            var childCount = function(level, n) {

                if (n.children && n.children.length > 0) {
                    if (levelWidth.length <= level + 1) levelWidth.push(0);

                    levelWidth[level + 1] += n.children.length;
                    n.children.forEach(function(d) {
                        childCount(level + 1, d);
                    });
                }
            };
            childCount(0, root);
            var newHeight = d3.max(levelWidth) * 25; // 25 pixels per line
            tree = tree.size([newHeight, viewerWidth]);

            // Compute the new tree layout.
            var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

            // Set widths between levels based on maxLabelLength.
            nodes.forEach(function(d) {
                d.y = (d.depth * (maxLabelLength * 10)); //maxLabelLength * 10px
                // alternatively to keep a fixed scale one can set a fixed depth per level
                // Normalize for fixed-depth by commenting out below line
                // d.y = (d.depth * 500); //500px per level.
            });

            // Update the nodes…
            node = svgGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

            // Enter any new nodes at the parent's previous position.
            var nodeEnter = node.enter().append("g")
            .call(dragListener)
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', click);

            nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

            nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".35em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.word;
            })
            .style("fill-opacity", 0);

            // phantom node to give us mouseover in a radius around it
            nodeEnter.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 30)
            .attr("opacity", 0.2) // change this to zero to hide the target area
            .style("fill", "red")
            .attr('pointer-events', 'mouseover')
            .on("mouseover", function(node) {
                overCircle(node);
            })
            .on("mouseout", function(node) {
                outCircle(node);
            });

            // Update the text to reflect whether node has children or not.
            node.select('text')
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.word;
            });

            // Change the circle fill depending on whether it has children and is collapsed
            node.select("circle.nodeCircle")
            .attr("r", 4.5)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

            // Transition nodes to their new position.
            var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

            // Fade the text in
            nodeUpdate.select("text")
            .style("fill-opacity", 1);

            // Transition exiting nodes to the parent's new position.
            var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

            nodeExit.select("circle")
            .attr("r", 0);

            nodeExit.select("text")
            .style("fill-opacity", 0);

            // Update the links…
            var link = svgGroup.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            });

            // Enter any new links at the parent's previous position.
            link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            });

            // Transition links to their new position.
            link.transition()
            .duration(duration)
            .attr("d", diagonal);

            // Transition exiting nodes to the parent's new position.
            link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

            // Stash the old positions for transition.
            nodes.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        // Append a group which holds all nodes and which the zoom Listener can act upon.
        var svgGroup = baseSvg.append("g");

        // Define the root
        root = treeData;
        root.x0 = viewerHeight / 2;
        root.y0 = 0;

        // Layout the tree initially and center on the root node.
        update(root);
        centerNode(root);
    });
}


function getDataFromElastic() {

    var body = {
        "aggs": {
            "ortMain": {
                "geohash_grid": {
                    "buckets_path": "years",
                    "field": "gisOrt",
                    "precision": bucketResolution - 4
                },
                "aggs": {
                    "years": {
                        "date_histogram": {
                            "field": "startYear",
                            "interval": (365*yearResolution)+"d",
                            "time_zone": "Europe/Berlin",
                            "min_doc_count": 0
                        }
                    }
                }
            },
            "yearsMain": {
                "date_histogram": {
                    "field": "startYear",
                    "interval": (365*yearResolution)+"d",
                    "time_zone": "Europe/Berlin",
                    "min_doc_count": 0
                },
                "aggs": {
                    "ort": {
                        "geohash_grid": {
                            "buckets_path": "years",
                            "field": "gisOrt",
                            "precision": bucketResolution - 4
                        }
                    }
                }
            }
        }
    };

    if ((filterMain.val() == undefined || filterMain.val().length == 0) && (filterLeft.val() == undefined || filterLeft.val().length == 0)){
        body["query"] = {"match_all": {}};
    }
    else{
        if($("#lemma-and-or-selector option:selected").val() == "and"){
            body["query"] = getQueryObjectForParams(filterMain.val(), filterLeft.val(), "and");
        }
        else{
            body["query"] = getQueryObjectForParams(filterMain.val(), filterLeft.val(), "or");
        }
    }

    if (!filterMain.val() && !filterLeft.val())
    body["size"] = 0;

    return esClient.search({
        index: 'tustepgeo2',
        body: body
    });
}


function getLemmasInGeoHashBucket(geo_hash) {
    return esClient.search({
        index: 'tustepgeo2',
        body: {
            "size": 0,
            "query": {
                "prefix": {
                    "gisOrt.geohash": geo_hash
                }
            },
            "aggs": {
                "mainLemma": {
                    "terms": {
                        "field": "mainLemma.raw",
                        "size": 2000
                    },
                    "aggs": {
                        "leftLemma": {
                            "terms": {
                                "field": "leftLemma.raw"
                            }
                        }
                    }
                }
            }
        }
    });
}

function getAllRecordsForWord(word) {

    return esClient.search({
        index: 'tustepgeo2',
        body: {
            "size": 10000,
            "query": {
                "bool": {
                    "should": [
                        {
                            "query_string": {
                                "default_field": "mainLemma",
                                "query": word
                            }
                        },
                        {
                            "query_string": {
                                "default_field": "leftLemma",
                                "query": word
                            }
                        }
                    ]
                }
            }
        }
    });
}

function getQueryObjectForParams(mainLemma, leftLemma, andOr) {

    if (mainLemma == undefined || mainLemma.length == 0)
    mainLemma = "*";

    if (leftLemma == undefined || leftLemma.length == 0)
    leftLemma = "*";

    if(andOr == "and"){
        return {
            "bool": {
                "must": [
                    {
                        "query_string": {
                            "default_field": "mainLemma",
                            "query": mainLemma
                        }
                    },
                    {
                        "query_string": {
                            "default_field": "leftLemma",
                            "query": leftLemma
                        }
                    }
                ]
            }
        };
    }
    else{
        return {
            "bool": {
                "should": [
                    {
                        "query_string": {
                            "default_field": "mainLemma",
                            "query": mainLemma
                        }
                    },
                    {
                        "query_string": {
                            "default_field": "leftLemma",
                            "query": leftLemma
                        }
                    }
                ]
            }
        };
    }
}

function getGridDataFromElastic() {

    var body = {
        "size": 0,
        "query": {
            "match_all": {}
        },
        "aggs": {
            "ortMain": {
                "geohash_grid": {
                    "field": "gisOrt",
                    "precision": bucketResolution - 5
                },
            }
        }
    };

    return esClient.search({
        index: 'tustepgeo2',
        body: body
    });
}

function resetTimelineColor(){
    timelineChart.selectAll('rect.bar').each(function(dBar){
        d3.select(this).transition().duration(500).style("fill", "black");
    });
}

function showHideLemmaList(show){
    if(show){
        if(d3.select("#lemma-list-holder").classed("collapsed") == true){
            d3.select("#lemma-list-holder").classed("collapsed",false);
            $("#lemma-list-handle").html("&raquo;");
        }
    }
    else{
        if(d3.select("#lemma-list-holder").classed("collapsed") == true){
            d3.select("#lemma-list-holder").classed("collapsed",false);
            $("#lemma-list-handle").html("&raquo;");
        }
        else{
            d3.select("#lemma-list-holder").classed("collapsed",true);
            $("#lemma-list-handle").html("&laquo;");
        }
    }
}

function getBoundingBoxCenterLatLon(bbox) {
    var ne = bbox.ne;
    var sw = bbox.sw;
    var center = [ne.lon - (ne.lon-sw.lon)/2, sw.lat - (sw.lat-ne.lat)/2];
    return center;
}
function getBoundingBoxLatLon(bbox) {
    var ne = bbox.ne;
    var sw = bbox.sw;
    var latLonBox = [[sw.lon,sw.lat],[ne.lon,ne.lat]];
    return latLonBox;
}

})();
