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

    d3.select("#livesearch-holder")
    .on("keyup", function() {
        update();
    });

    filterMain = $("#filterMain");
    filterLeft = $("#filterLeft");


    // MAP VARIABLES + INITIALIZATION

    var bucketResolution = 7;
    var yearResolution = 1;
    var svg,
        geoFeaturesLayer,
        geohashBuckets;

    cartoMap = d3.carto.map();
    d3.select("#map").call(cartoMap);


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


    $('.zoomcontrol').bind('click', function() {
        console.log(cartoMap.projection());
        var projection = cartoMap.projection();
        console.log(JSON.stringify(projection.invert(40, 10)));
        console.log(JSON.stringify(cartoMap.zoom().translate()));
    });

        // TILES + COUNTRY BORDERS

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

    cartoMap.addCartoLayer(terrainLayer);
    cartoMap.addCartoLayer(geojsonLayer);

    cartoMap.setScale(5);
    cartoMap.centerOn([13.333333, 46.333333],"latlong");

    // GEO BUCKETS SCALE/PRECISION CONTROL

    $("#bucket-resolution-selector").change(function() {
        bucketResolution = parseInt($("#bucket-resolution-selector option:selected").val());
        update();
    });

    // LEMMA LIST HANDLE

    $("#lemma-list-handle").on("click", function() {
        showHideLemmaList();
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
                    refreshGeoFeatures();
                }
                else {
                    // Clear the timeline
                    d3.selectAll("rect.bar").remove();

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

        timelineChart.selectAll('rect.bar').each(function(dBar){
            d3.select(this).transition().duration(500).style("fill", "black");
        });

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

    function refreshGeoFeatures(){
        // var geoFeatures = generateGeoFeatures(resp);
        var geoFeatures = generateCrossGeoFeatures();
        //generateTimeline(resp);

        // console.log("GEOFEATURES");

        if (geoFeatures && geoFeatures.length > 0) {

            getMinMaxMeanDocCounts(geoFeatures);

            function colorByCount(minDoc, mean, maxDoc) {
                mean = mean || docCountMean;
                minDoc = minDoc || minDocCount;
                maxDoc = maxDoc || maxDocCount;
                var colorScale = d3.scale.linear()
                .range(colorbrewer.OrRd[3])
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
                //.clickableFeatures(true);
                cartoMap.addCartoLayer(geoFeaturesLayer);
            } else {
                geoFeaturesLayer
                .features(geoFeatures);
                //.clickableFeatures(true);
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

        $("g.featureLayer").unbind('click');
        d3.selectAll("g.featureLayer").data(geoFeatures)
        .on("click",function(d,i){

            // Zoom and rise resolution
            if(bucketResolution < 11){
                var delay = 2000;
                cartoMap.zoomTo(getBoundingBoxLatLon(d.properties.bounds),"latlong",.2,delay);
                setTimeout(
                    function() {
                        bucketResolution +=1;
                        $("#bucket-resolution-selector").val(bucketResolution);
                        update();
                    }, delay-850
                );
            }

            // Show lemmas contained in the bucket
            $('#lemma-list-table').html("");
            for(var i=0; i<5/*d.doc_count*/; i++){
                $('#lemma-list-table').append(function(){
                    var html = '<div class="lemma-list-row">';
                    html += "Lemma #"+Math.floor(Math.random() * 500) + 1  
                    html += '</div>'
                    return html;
                });
            }

            showHideLemmaList(true);
        });

        $("g.featureLayer").unbind('mouseover');
        $("g.featureLayer").unbind('mouseout');
        d3.selectAll("g.featureLayer").data(geoFeatures)
        .on("mouseover",function(dFeature,i){

            var w = 30, h = 30, r = 50;
            var color = d3.scale.category20c();

            var data = [{"label":"Feature", "value":dFeature.properties.doc_count},
            {"label":"All", "value":parseInt($("#timeline-lemma-count").html())-dFeature.properties.doc_count}];

            var vis = d3.select(this).append("svg:svg").data([data]).attr("class","vis").attr("width", w).attr("height", h).append("svg:g").attr("transform", "translate(" + r + "," + r + ")");
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
            timelineChart.selectAll('rect.bar').each(function(dBar){
                d3.select(this).transition().duration(500).style("fill", "black");
            });
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

        body["query"] = getQueryObjectForParams(filterMain.val(), filterLeft.val());

        if (!filterMain.val() && !filterLeft.val())
        body["size"] = 0;

        return esClient.search({
            index: 'tustepgeo2',
            body: body
        });
    }

    function getQueryObjectForParams(mainLemma, leftLemma, category) {

        if (mainLemma == undefined || mainLemma.length == 0)
        mainLemma = "*";

        if (leftLemma == undefined || leftLemma.length == 0)
        leftLemma = "*";

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
