var mainExports = {};
(function() {

    // ELASTIC

    var esClient = new $.es.Client({
        hosts: elasticEndpoint
    });

    var indexName = 'tustepgeo3';

    // CROSSFILTER SHARED DATA

    var ndx; // crossfilter handle
    var tustepData = [];
    var tustepDataNoYears = [];
    var timelineChart = dc.barChart('#timeline');
    var maxHeightBar = undefined;

    var allDim, yearDim;
    var groupOfDocsPerYear;
    var minYear, maxYear;
    var selectedMinYear, selectedMaxYear;
    // var timelineYaxisNeedsUpdate = false;

    var minDocCount, maxDocCount, docCountMean;
    var minDocCountOverall, maxDocCountOverall, docCountMeanOverall;

    // LEMMA SEARCH VARIABLES

    var filterMain, filterLeft;
    var lemmaTreeRootWord = "";
    var lemmaTreeScope = "";
    var generatingTree = false;

    $("#livesearch-holder > form > input")
        .on("input", function() {
            if(filterMain.val() == "" && filterLeft.val() == ""){
                //resetApp();
                //w2ui['content'].hide('left');
                update();
            }
            else{
                resetTimelineColor(600);
                update();
            }
        });

    $("#lemma-and-or-selector").change(function(){
        resetTimelineColor(600);
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
    var clickedGeoHash = "";

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
        var projection = cartoMap.projection();
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

    function resetBucketResolution(){
        bucketResolution = 7;
        $("#bucket-resolution-selector").val(bucketResolution);
    }

    $("#bucket-resolution-selector").change(function() {
        bucketResolution = parseInt($("#bucket-resolution-selector option:selected").val());
        update();
    });

    // RESET VIEW CONTROL

    $("#reset-map-button").on("click", function() {
        w2ui['content'].hide('left');
        setTimeout(function () {
            cartoMap.refresh();
            setTimeout(function () {
                cartoMap.zoomTo(
                    [[originalBBox[0][0]+2,originalBBox[0][1]-.8],[originalBBox[1][0]+2,originalBBox[1][1]-.8]],
                    "latlong",1,zoomDelay
                );
                resetBucketResolution();
                setTimeout(function () {
                    update();
                }, zoomDelay);
            }, 750);
        }, 500);
    });

    // RESET APP CONTROL

    $("#reset-app-button").on("click", function() {
        resetApp();
    });

    function resetApp(){
        w2ui['content'].hide('left');
        showHideLemmaList(false);
        $("#filterLeft").val("");
        $("#filterMain").val("");
        $("#lemma-graph").html("");
        $("#lemma-list-table").html("");
        $('#nontemporal-checkbox').removeAttr('checked');
        timelineChart.filter(null);
        timelineChart.filterAll();
        dc.redrawAll();
        refreshLemmaTree = true;
        clickedGeoHash = "";
        setTimeout(function () {
            cartoMap.refresh();
            setTimeout(function () {
                cartoMap.zoomTo(
                    [[originalBBox[0][0]+2,originalBBox[0][1]-.8],[originalBBox[1][0]+2,originalBBox[1][1]-.8]],
                    "latlong",.8,zoomDelay
                );
                resetBucketResolution();
                setTimeout(function () {
                    update();
                }, zoomDelay);
            }, 750);
        }, 500);
    }

    // NON-TEMPORAL CHECKBOX LISTENER

    $('#nontemporal-checkbox').change(
        function(){
            update();
            refreshTreeGraphForLemma();

            // Only if the lemma list tab is open, refresh it
            if(d3.select("#lemma-list-holder").classed("collapsed") == false){
                getLemmasInGeoHashBucket(clickedGeoHash).then(function (resp) {
                    generateLemmaList(resp.aggregations);
                });
            }

            // if ($(this).is(':checked')) {
            //     //alert('checked');
            // }
            // else {
            //     //alert('unchecked');
            // }
        });

    // TOOLTIP SHOW CONTROL INITIAL ACTIVATION
    $('#tooltip-checkbox').val($(this).is(':checked'));

    // LEMMA LIST HANDLE

    $("#lemma-list-handle").hide();
    $("#lemma-list-handle").on("click", function() {
        showHideLemmaList();
    });

    // MAP TOOLTIP

    var tooltip = $('#tooltip');
    tooltip.hide();
    var tooltipYmodifier = 0;
    $(document).mousemove(function(e){
        var tooltipW = 150, tooltipH = 150;
        tooltip.css({'top': e.pageY - tooltip.height()/2 - tooltipYmodifier,'left': e.pageX - tooltip.width()/2});
    });

    // SINGLE RECORD OVERLAY CLOSER LISTENER

    $("#single-lemma-box-closer").on("click", function(){
        $("#single-lemma-holder").fadeOut();
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
                        // Clear the timeline
                        timelineChart.selectAll("rect.bar").remove();

                        // Hide the legend
                        $("#legend-holder").hide();

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
        tustepDataNoYears = [];
        geohashBuckets = resp.aggregations.ortMain.buckets;

        geohashBuckets.forEach(function(bucket){
            if (bucket.years !== undefined) {
                bucket.years.buckets.forEach(function(year){
                    tustepData.push({"hash":bucket.key, "year":year.key_as_string, "docs":year.doc_count});
                });
            }
            if (bucket.noYear !== undefined) {
                tustepDataNoYears.push({"hash":bucket.key, "year":"noYear", "docs":bucket.noYear.doc_count});
            }
        });

        minYear = _.min(tustepData, function(reg){return parseInt(reg.year);}).year;
        maxYear = _.max(tustepData, function(reg){return parseInt(reg.year);}).year;
    }

    function refreshCrossfilter(){

        // Show the legend
        $("#legend-holder").show();

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

        setTimeout(function () {
            resetTimelineColor(600);
        }, 500);

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
            .margins(margins)
            .transitionDuration(1);
        timelineChart.xAxis().tickValues(_.unique(_.pluck(yearDim.top(Infinity),"year")).sort().filter(function(el, index) {return index % 10 === 1;}));
        //timelineChart.yAxis().tickValues(0);

        // timelineChart.on("preRedraw", function (chart) {
        //     chart.rescale();
        // });
        // timelineChart.on("preRender", function (chart) {
        //     chart.rescale();
        // });

        // Brush throttle, to update only on brush end
        var b = timelineChart.brush();
        b.on('brushstart.custom', function() {
            timelineChart.userIsBrushing = true;
        });
        b.on('brushend.custom', function() {
            timelineChart.userIsBrushing = false;

            // Only if the lemma list tab is open, refresh it
            if(d3.select("#lemma-list-holder").classed("collapsed") == false){
                getLemmasInGeoHashBucket(clickedGeoHash).then(function (resp) {
                    generateLemmaList(resp.aggregations);
                });
            }
        });

        // Update the map after any brushing action
        timelineChart.on('filtered', function () {
            if (timelineChart.userIsBrushing) return;
            refreshGeoFeatures();
            timelineChart.selectAll('g.x text')
                .attr('transform', 'translate(-10,10) rotate(315)');
        });


        timelineChart.on("preRedraw", function() {
            $('g.tick.custom').remove();
        });
        timelineChart.on("postRedraw", function() {

            // Recalculate bar heights
            var allTimelineBars = timelineChart.selectAll('rect.bar')[0];
            if(maxHeightBar == undefined){
                maxHeightBar = d3.max(allTimelineBars, function(d) {
                    return parseInt($(d).attr("height"));
                });
            }

            var maxDocsYear = d3.max(allTimelineBars, function(d){
                return parseInt(d3.select(d)[0][0].__data__.y);
            });
            var meanDocsYear = d3.mean(allTimelineBars, function(d){
                return parseInt(d3.select(d)[0][0].__data__.y);
            });

            if(maxDocsYear == 1 || maxDocsYear == 0 || allTimelineBars.length == 0){
                $(".customizedtimeline").remove();
                return;
            }

            var meanValue = parseInt(meanDocsYear/(Math.sqrt(meanDocsYear)/2));
            var heightScale = d3.scale.linear()
                .range([0,maxHeightBar/2,maxHeightBar])
                .domain([0, meanValue, maxDocsYear]);

            timelineChart.selectAll('rect.bar').each(function(dBar){
                var y = d3.select(this)[0][0].__data__.y;
                var newHeight = heightScale(y);
                var newY = 50 - newHeight;
                d3.select(this)
                .attr("height", newHeight)
                .attr("y", newY);
            });

            $("g.axis.y").prepend(document.createElementNS("http://www.w3.org/2000/svg", "g"));
            $("g.axis.y > g:nth-child(1)").append(document.createElementNS("http://www.w3.org/2000/svg", "line"));
            $("g.axis.y > g:nth-child(1)").append(document.createElementNS("http://www.w3.org/2000/svg", "text"));

            $("g.axis.y > g:nth-child(1)")
            .attr("class","tick custom")
            .attr("transform","translate(0,25)")
            .attr("style","opacity:1");

            $("g.axis.y > g:nth-child(1) > line")
            .attr("x2","-6")
            .attr("y2","0");

            $("g.axis.y > g:nth-child(1) > text").html(meanValue);
            $("g.axis.y > g:nth-child(1) > text")
            .attr("dy",".32em")
            .attr("x","-9")
            .attr("style","text-anchor: end")
            .attr("y","0");
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
        //resetTimelineColor();

        mainExports.timelineChart = timelineChart;
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

        if(minYear == maxYear){
            minYear--;
            maxYear++;
        }
        else if(maxYear == yearDim.top(Infinity)[0].year){
            maxYear++;
        }

        var years = [];
        for(var i=parseInt(minYear)-1; i<=maxYear; i++){years.push(i);}
        // if(yearResolution == 1){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
        // else if(yearResolution == 5){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
        // else if(yearResolution == 10){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
        // else if(yearResolution == 25){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 25 === 1;}));}
        var yearDiff = maxYear - minYear;
        if(yearDiff > 200){
            if(yearResolution == 1){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
            else if(yearResolution == 5){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
            else if(yearResolution == 10){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
            else if(yearResolution == 25){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 25 === 1;}));}
        }
        else if(yearDiff > 150){
            if(yearResolution == 1){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 3 === 1;}));}
            else if(yearResolution == 5){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 5 === 1;}));}
            else if(yearResolution == 10){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
            else if(yearResolution == 25){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 25 === 1;}));}
        }
        else if(yearDiff > 80){
            if(yearResolution == 1){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 2 === 1;}));}
            else if(yearResolution == 5){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 5 === 1;}));}
            else if(yearResolution == 10){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
            else if(yearResolution == 25){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 25 === 1;}));}
        }
        else if(yearDiff > 50){
            if(yearResolution == 1){timelineChart.xAxis().tickValues(years);}
            else if(yearResolution == 5){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 5 === 1;}));}
            else if(yearResolution == 10){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
            else if(yearResolution == 25){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 25 === 1;}));}
        }
        else{
            if(yearResolution == 1){timelineChart.xAxis().tickValues(years);}
            else if(yearResolution == 5){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 5 === 1;}));}
            else if(yearResolution == 10){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 10 === 1;}));}
            else if(yearResolution == 25){timelineChart.xAxis().tickValues(years.filter(function(el, index) {return index % 25 === 1;}));}
        }

        // if(yearResolution == 1){
        //     timelineChart.centerBar(true);
        // }
        // else{
        //     timelineChart.centerBar(false);
        //     // setTimeout(function () {
        //     //     var ticks = timelineChart.selectAll("g.x > g.tick");
        //     //     var tickOneCoords = d3.transform(d3.select(ticks[0][0]).attr("transform")).translate;
        //     //     var tickTwoCoords = d3.transform(d3.select(ticks[0][1]).attr("transform")).translate;
        //     //     timelineChart.xUnits(function(){return parseInt(tickTwoCoords[0]-tickOneCoords[0])-1;});
        //     // }, 1000);
        // }

        dc.redrawAll();

        // setTimeout(function () {
        //     resetTimelineColor();
        // }, 200);

        refreshTreeGraphForLemma(lemmaTreeRootWord,lemmaTreeScope);
    }

    function updateTimelineYscale(geoFeatures){

        // Get min/mean/max docCounts and update the Y axis of the chart

        // This gets done only once per data update, so the chart remains the same
        // no matter if the user brushes it, until another dataset is loaded (detail changed)

        getMinMaxMeanDocCountsOverall();

        // timelineChart.y(d3.scale.linear().domain([minDocCountOverall, maxDocCountOverall]));
        // timelineChart.yAxis().tickValues([minDocCountOverall, maxDocCountOverall]);
        timelineChart.y(d3.scale.linear().domain([0, maxDocCountOverall]));
        timelineChart.yAxis().tickValues([0, maxDocCountOverall]);
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


    function refreshTreeGraphForLemma(lemma,scope){
        if(w2ui['content'].get('left').hidden == false)
            if($("#info-tree").length > 0)
                if(lemma != undefined && lemma!="" && scope != undefined && scope != ""){
                    generateTreeGraphForLemma(lemma,scope);
                }
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

                geoGridLayer
                    .features(gridFeatures);
                cartoMap.refreshCartoLayer(geoGridLayer);

                // Highlight the clicked grid, if any
                d3.selectAll('path.bucketGrid')
                    .style("stroke", function(d){
                        if(d.properties.key == clickedGeoHash){return "#00b8ff";}
                        else {return "rgba(0,0,0,.5)";}
                    })
                    .style("stroke-width", function(d){
                        if(d.properties.key == clickedGeoHash){return "5px";}
                        else {return "1px";}
                    });
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
                    .style("fill", function (d) {return colorScale(d.properties.doc_count);})
                d3.selectAll("g.featureLayer")
                    .style("opacity", "0.8");

                refreshColorLegend(geoFeatures,colorScale);
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
        else if(geoFeatures.length == 0){ // Empty brush selection, for example
            geoFeaturesLayer
                .features([]);
            //.clickableFeatures(true);
            cartoMap.refreshCartoLayer(geoFeaturesLayer);

            // Update counters to show no data was found
            $("#timeline-lemma-count").html(0);
        }
    }

    function bindGeoFeaturesActions(geoFeatures){
        var featureLayer = $("g.featureLayer");
        featureLayer.unbind('click');
        d3.selectAll("g.featureLayer").data(geoFeatures)
            .on("click",function(d,i){

                // Save the geohash id, to highlight it in the grid
                clickedGeoHash = d.properties.key;

                // Hide tooltip
                tooltip.hide();


                if(d.properties.doc_count == 1){
                    getSingleRecordFullData().then(function(resp){

                        var lemma = resp.hits.hits[0]._source;

                        if(resp.hits.hits[0]._source.leftLemma != undefined &&
                        resp.hits.hits[0]._source.leftLemma != ""){
                            $("#single-lemma-left").show();
                            $("#single-lemma-left > span").html(resp.hits.hits[0]._source.leftLemma);
                        }
                        else {
                            $("#single-lemma-left").hide();
                        }

                        if(resp.hits.hits[0]._source.mainLemma != undefined &&
                        resp.hits.hits[0]._source.mainLemma != ""){
                            $("#single-lemma-main").show();
                            $("#single-lemma-main > span").html(resp.hits.hits[0]._source.mainLemma);
                        }
                        else {
                            $("#single-lemma-main").hide();
                        }

                        // Show all TUSTEP fields available for the lemma
                        var keys = Object.keys(lemma.tustep);

                        _.forEach(keys, function(key){
                            if(key != "fileName" && key != "recordNumber" && key != "orig"){
                                $("#single-lemma-data").append(function(){
                                    var html = "";
                                    html += "<div class='single-lemma-info'>";
                                    html += "<strong>"+key+": </strong>";
                                    html += lemma.tustep[key];
                                    html += "</div>";
                                    return html;
                                })
                            }
                        })

                        $("#single-lemma-holder").fadeIn();
                    });
                } else {
                    // Zoom and rise resolution
                    if(bucketResolution < 11){
                        resetTimelineColor(600);
                        setTimeout(function () { // Wait for the toggle left, then center
                            cartoMap.refresh();
                            cartoMap.zoomTo(getBoundingBoxLatLon(d.properties.bounds),"latlong",.2,zoomDelay);
                            setTimeout(
                                function() {
                                    bucketResolution +=1;
                                    $("#bucket-resolution-selector").val(bucketResolution);
                                    update();
                                }, zoomDelay-850
                            );
                        }, 750);
                    }
                    // Reset opacity of all
                    d3.selectAll("g.featureLayer")
                        .style("opacity", "0.8");
                    // .style("stroke-width","0px")
                    // .style("stroke","black");

                    getLemmasInGeoHashBucket(d.properties.key).then(function (resp) {
                        generateLemmaGraphFromAggregations(resp.aggregations);
                        generateLemmaList(resp.aggregations);
                    });
                }
            });
        featureLayer.unbind('mouseover');
        featureLayer.unbind('mouseout');
        d3.selectAll("g.featureLayer").data(geoFeatures)
            .on("mouseover",function(dFeature,i){

                // Highlight this, low opacity of others
                d3.selectAll("g.featureLayer")
                    .style("opacity", "0.2")
                // .style("stroke-width","0px")
                // .style("stroke","black");
                d3.select(this)
                    .style("opacity","0.8")
                // .style("stroke-width","4px")
                // .style("stroke","#2b91fc");

                // Only if the user wants to see the tooltip
                if($("#tooltip-checkbox").is(":checked")) {

                    var featureCount = dFeature.properties.doc_count;
                    var restCount = parseInt($("#timeline-lemma-count").html())-dFeature.properties.doc_count;

                    tooltipYmodifier = 0;
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
                    // var color = d3.scale.category20c();
                    // var color = d3.scale.ordinal()
                    //     .domain([featureCount,restCount])
                    //     .range(["#2b91fc", "#d6eaff"]);

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
                            if (i==0) return "#2b91fc";
                            else return "#d6eaff";
                        })
                        .attr("d", function (d) {
                            return arc(d);
                        });

                    tooltip.show();
                }

                // Highlight related years in timeline
                setTimeout(function () {
                    timelineChart.selectAll('rect.bar').each(function(dBar){
                        if(dFeature.properties.years.indexOf(parseInt(dBar.x)) > -1){
                            d3.select(this)/*.transition().duration(500)*/.style("fill", "#2b91fc");
                        }
                        else {
                            d3.select(this)/*.transition().duration(500)*/.style("fill", "black");
                        }
                    });
                }, 100);
            })
            .on("mouseout",function(dFeature,i){

                // Reset opacity of all
                d3.selectAll("g.featureLayer")
                    .style("opacity", "0.8")
                // .style("stroke-width","0px")
                // .style("stroke","black");

                resetTimelineColor(0);
                tooltip.hide();
            });
    }

    function generateCrossGeoFeatures() {

        var newGeoHashBuckets = [];
        var hashStringArray = _.unique(_.pluck(yearDim.top(Infinity),"hash").concat(_.pluck(tustepDataNoYears,"hash")));


        if(yearDim.top(Infinity).length == 0){
            return [];
        }
        else{
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

                // Take the non-temporal data into account only if no brushing is applied
                if (timelineChart.filters().length == 0) {
                    _.each(tustepDataNoYears, function(data){
                        if(geoObject.key == data.hash){
                            geoObject.doc_count += parseInt(data.docs);
                        }
                    });
                }

                if(geoObject.doc_count > 0)
                    newGeoHashBuckets.push(geoObject);
            });

            newGeoHashBuckets = _.filter(newGeoHashBuckets, function (el) {
                return el.doc_count > 0;
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


    function generateLemmaList(resp){

        // Show lemmas contained in the bucket
        var lemmaListTable = $('#lemma-list-table');
        lemmaListTable.html("");

        if($("#nontemporal-checkbox").is(":checked")) {$("#lemma-list-notice").show();}
        else{$("#lemma-list-notice").hide();}

        var wordBuckets = resp.mainLemma.buckets.sort(function(a,b) {return b.doc_count - a.doc_count;});
        var foundLemmas = [];
        var counter = 0;

        $("#lemma-list-detail").html("");
        for(var i = 0; counter<20 && i<wordBuckets.length; i++){
            var isInRange = false;
            _.forEach(wordBuckets[i].years.buckets,function(yearBucket){
                if(parseInt(yearBucket.key_as_string) >= selectedMinYear &&
                parseInt(yearBucket.key_as_string) <= selectedMaxYear)
                    isInRange = true;
            });
            // Non-temp are always added if needed
            if ($("#nontemporal-checkbox").is(':checked')) {
                // Take the non-temporal data into account only if no brushing is applied
                if (timelineChart.filters().length == 0) {
                    if(wordBuckets[i].years.buckets[0] == undefined){
                        isInRange = true;
                    }
                }
            }
            if(isInRange) {
                lemmaListTable.append(function(){
                    var html = '<div class="lemma-list-row">';
                    html += '<strong>'+(counter+1)+'.</strong> <span class="lemma-list-word">'+wordBuckets[i].key+'</span>';
                    html += '<div class="lemma-list-actions">';
                    html += '<div class="lemma-button relations rel-db">Plot Relations in Dataset</div>';
                    html += '<div class="lemma-button relations rel-bucket">Plot Relations in Bucket</div>';
                    html += '<div class="lemma-button map">Plot in Map</div>';
                    html += '</div>';
                    html += '</div>';
                    return html;
                });
                counter++;
                foundLemmas.push(wordBuckets[i].key);
            }
        }

        // Lemma List Listeners

        d3.selectAll(".lemma-button.relations.rel-db").data(wordBuckets)
            .on("click",function(lemmaBucket,i){
                lemmaTreeRootWord = foundLemmas[i];
                lemmaTreeScope = "db";
                generateTreeGraphForLemma(lemmaTreeRootWord,lemmaTreeScope);
                w2ui['content'].show('left');
            });

        d3.selectAll(".lemma-button.relations.rel-bucket").data(wordBuckets)
            .on("click",function(lemmaBucket,i){
                lemmaTreeRootWord = foundLemmas[i];
                lemmaTreeScope = "bucket";
                generateTreeGraphForLemma(lemmaTreeRootWord,lemmaTreeScope);
                w2ui['content'].show('left');
            });

        d3.selectAll(".lemma-button.map").data(wordBuckets)
            .on("click",function(lemmaBucket,i){
                plotInMap(foundLemmas[i],"or",foundLemmas[i]);
            });

        showHideLemmaList(true);
    }


    function generateLemmaGraphFromAggregations(resp_aggregations) {
        var nodes = [],
            links = [];

        _.forEach(resp_aggregations.mainLemma.buckets, function (bucket) {

            if (bucket.leftLemma.buckets.length == 0)
                return; //Skip

            var bucketIndex = _.findIndex(nodes, function (node) {
                return node.name == bucket.key;
            });
            if (bucketIndex == -1) {
                var years = [];
                _.forEach(bucket.years.buckets, function(year){years.push(parseInt(year.key_as_string)+1)});
                bucketIndex = nodes.push({
                        "name"      : bucket.key,
                        "mainLemma" : true,
                        "weight": 0,
                        "years" : years
                    }) - 1;
            }
            _.forEach(bucket.leftLemma.buckets, function (bucket_leftLemma) {
                var leftLemmaIndex = _.findIndex(nodes, function (node) {
                    return node.name == bucket_leftLemma.key;
                });
                if (leftLemmaIndex == -1) {
                    var years = [];
                    _.forEach(bucket_leftLemma.years.buckets, function(year){years.push(parseInt(year.key_as_string)+1)});
                    leftLemmaIndex = nodes.push({
                            "name": bucket_leftLemma.key,
                            "weight" : 0,
                            "years" : years
                        }) - 1;
                }
                var linkIndex = _.findIndex(links, function(link) {
                    return link.source == bucketIndex &&
                        link.target == leftLemmaIndex;
                });

                if (linkIndex !== -1) {
                    links[linkIndex].value += bucket_leftLemma.doc_count;
                } else {
                    links.push({
                        "source":   leftLemmaIndex,
                        "target":   bucketIndex,
                        "weight":   bucket_leftLemma.doc_count
                    });
                }
                nodes[leftLemmaIndex].weight += 1;
                nodes[bucketIndex].weight += 1;
            });
        });


        var comNodes = _.map(nodes, function (node) {
            return node.name;
        });

        var comLinks = _.map(links, function (link) {
            return {
                "source": comNodes[link.source],
                "target": comNodes[link.target],
                "weight": link.weight
            };
        });


        var community = jLouvain().nodes(comNodes).edges(comLinks);
        var result = community();

        nodes = _.map(nodes, function (node) {
            node.community = result[node.name];
            return node;
        });

        var minCom = d3.min(nodes, function(d){ return d.community});
        var maxCom = d3.max(nodes, function(d){ return d.community});

        var communities = [];
        for(var i = minCom; i<=maxCom; i++) {
            communities.push({
                id: i,
                population: _.filter(nodes, function(node){ return node.community == i;}).length
            });
        }
        communities = _.sortBy(communities, "population");

        // $("#graph-node-number").html('<span>' + nodes.length + ' lemmas</span>');
        var lemmaGraph = $("#lemma-graph");
        lemmaGraph.html("");
        lemmaGraph.append(function(){
            var html = "";
            html += '<div id="com-graph">';
            if(comNodes.length == 0 || comLinks.length == 0){
                html += '<div id="info-com"><strong>No relations found</strong> for the selected bucket';
            }
            else {
                html += '<div id="info-com">Showing <strong>community</strong> graph for the selected bucket';
            }
            html += '</div>';
            html += '</div>';
            return html;

        });
        $("#com-graph").css({'height': '100%'});

        w2ui['content'].show('left');

        if(comNodes.length == 0 || comLinks.length == 0){
            return;
        }
        else {
            setTimeout(function () {
                d3.lemmaGraph('#com-graph')
                    .nodes(nodes)
                    .links(links)
                    .communities(communities)
                    .update();
            }, 1000);
        }
    }


    function plotInMap(leftLemma,andOr,mainLemma){

        resetBucketResolution();

        d3.selectAll("#live-search > input").classed("flash",true);
        setTimeout(function () {
            d3.selectAll("#live-search > input").classed("flash",false);
        }, 200);



        $("#filterLeft").val(filterSearchString(leftLemma));
        $("#filterMain").val(filterSearchString(mainLemma));

        $("#lemma-and-or-selector").val(andOr);
        update();
        cartoMap.refresh();
        setTimeout(function () {
            cartoMap.zoomTo(
                [[originalBBox[0][0]+2,originalBBox[0][1]-.8],[originalBBox[1][0]+2,originalBBox[1][1]-.8]],
                "latlong",1,zoomDelay
            );
        }, 750);
    }

    mainExports.plotInMap = plotInMap;

    function generateTreeGraphForLemma(lemma,where){

        if(generatingTree) return;
        generatingTree = true;

        if($("#tree-graph").length != 0){
            $("#tree-graph").html("");
        }
        else {
            $("#com-graph").css({'height': '50%'});
            $("#lemma-graph").append('<div id="tree-graph"></div>');
        }

        getAllRecordsForWord(lemma,where).then(function (resp) {

            var asLeftLemma = [];
            var asMainLemma = [];

            function keepBuildingLemmaArray(array,side,hit){
                var object = {};
                if(side == "main"){
                    object.name = hit._source.leftLemma;
                }
                else {
                    object.name = hit._source.mainLemma;
                }
                if(object.name == undefined) return;
                object.count = 1;
                object.years = [];
                if (!$("#nontemporal-checkbox").is(':checked')) {
                    if(hit._source.startYear != undefined &&
                        parseInt(hit._source.startYear) >= selectedMinYear &&
                        parseInt(hit._source.startYear) <= selectedMaxYear){
                        object.years.push(parseInt(hit._source.startYear));
                    }
                    else{
                        return; // Save only lemmas withing the selected year range, discard rest
                    }
                }
                else{
                    if(hit._source.startYear != undefined){
                        object.years.push(parseInt(hit._source.startYear));
                    }
                }

                // If the record already exists, do not push it, just add to the count
                if(_.some(array, function(record) {return record.name == object.name;})){
                    _.forEach(array,function(lemma){
                        if(lemma.name == object.name){
                            if(hit._source.startYear != undefined){
                                lemma.years.push(parseInt(hit._source.startYear));
                            }
                            lemma.count++;
                        }
                    });
                }
                else{
                    array.push(object);
                }
            }

            _.forEach(resp.hits.hits,function(hit){
                if(lemma == hit._source.leftLemma){
                    keepBuildingLemmaArray(asLeftLemma,"left",hit);
                }
                else if(lemma == hit._source.mainLemma){
                    keepBuildingLemmaArray(asMainLemma,"main",hit);
                }
            });

            // Clear the years array of each lemma so they are unique and sorted
            _.forEach(asLeftLemma, function(record) {
                record.years = _.unique(record.years).sort(function(a,b) {return a - b;});
            });
            _.forEach(asMainLemma, function(record) {
                record.years = _.unique(record.years).sort(function(a,b) {return a - b;});
            });

            var uniqueLeftLemmas = _.unique(asLeftLemma, function(record){return record.name;});
            var uniqueMainLemmas = _.unique(asMainLemma, function(record){return record.name;});

            var uniqueLeftCounts = _.unique(_.pluck(asLeftLemma, "count")).sort(function(a,b) {return a - b;}).reverse();
            var uniqueMainCounts = _.unique(_.pluck(asMainLemma, "count")).sort(function(a,b) {return a - b;}).reverse();

            var dataLeft = generateDataForLemmas(asLeftLemma,uniqueLeftCounts);
            var dataMain = generateDataForLemmas(asMainLemma,uniqueMainCounts);

            function generateDataForLemmas(asLeftOrMainlemma,uniqueCounts){
                var data = [];
                for(var i=1; i<=uniqueCounts[0]; i++){

                    var firstLevelNode = {};
                    firstLevelNode.name = i+"+ Relations";
                    firstLevelNode.children = [];

                    if(i==1){
                        firstLevelNode.name = 1+" Relation";
                        _.forEach(asLeftOrMainlemma, function(record){
                            if(record.count == 1){
                                firstLevelNode.children.push(record);
                            }
                        });
                    }
                    else if(i==2 || i==3 || i==4){
                        firstLevelNode.name = i+" Relations";
                        _.forEach(asLeftOrMainlemma, function(record){
                            if(record.count == i){
                                firstLevelNode.children.push(record);
                            }
                        });
                    }
                    else if(i==5){
                        _.forEach(asLeftOrMainlemma, function(record){
                            if(record.count >= i && record.count < i+5){
                                firstLevelNode.children.push(record);
                            }
                        });
                    }
                    else if(i%10==0 && i<30){
                        _.forEach(asLeftOrMainlemma, function(record){
                            if(record.count >= i && record.count < i+10){
                                firstLevelNode.children.push(record);
                            }
                        });
                    }
                    else if(i%25==0 && i<100 && i>=30){
                        _.forEach(asLeftOrMainlemma, function(record){
                            if(record.count >= i && record.count < i+25){
                                firstLevelNode.children.push(record);
                            }
                        });
                    }
                    else if(i%50==0 && i>=100){
                        _.forEach(asLeftOrMainlemma, function(record){
                            if(record.count >= i && record.count < i+50){
                                firstLevelNode.children.push(record);
                            }
                        });
                    }

                    if(firstLevelNode.children.length > 0) {
                        if(i<5){
                            firstLevelNode.children.sort(function(a,b){
                                var x = a.name;
                                var y = b.name;
                                return x<y ? -1 : x>y ? 1 : 0;
                            });
                        }
                        else{
                            firstLevelNode.children.sort(function(a,b){
                                return a.count - b.count;
                            }).reverse();
                        }
                        data.push(firstLevelNode);
                    }
                }

                data.sort(function(a,b) {
                    var numA = parseInt(a.name.replace("+","").split(" ")[0]);
                    var numB = parseInt(b.name.replace("+","").split(" ")[0]);
                    return numA - numB;
                }).reverse();

                return data;
            }

            // _.forEach(uniqueLeftCounts, function(numRelations){
            //     var firstLevelNode = {};
            //     if(numRelations == 1){
            //         firstLevelNode.name = numRelations+" Relation";
            //     }
            //     else{
            //         firstLevelNode.name = numRelations+" Relations";
            //     }
            //     firstLevelNode.children = [];
            //     _.forEach(asLeftLemma, function(record){
            //         if(record.count == numRelations){
            //             firstLevelNode.children.push(record);
            //         }
            //     });
            //     firstLevelNode.children.sort();
            //     dataLeft.push(firstLevelNode);
            // });

            ////////
            var lemmaGraph = $("#tree-graph");
            lemmaGraph.append('<div id="tree-graph-left"></div>');
            lemmaGraph.append('<div id="tree-graph-right"></div>');

            if(dataMain.length > 0) {
                $("#tree-graph").append(function(){
                    var html = '<div id="info-tree">';
                    html += 'Showing relations for <strong>"'+lemma+'"</strong> as <strong>main</strong> lemma';
                    html += '</div>';
                    return html;
                });
                generateTreeSide(lemma,dataMain,"right");
            }

            if(dataLeft.length > 0) {
                if($("#info-tree").length == 0){
                    $("#tree-graph").append(function(){
                        var html = '<div id="info-tree">';
                        html += 'Showing relations for <strong>"'+lemma+'"</strong> as <strong>left</strong> lemma';
                        html += '</div>';
                        return html;
                    });
                }
                generateTreeSide(lemma,dataLeft,"left");
            }

            if(dataLeft.length == 0 && dataMain.length == 0){
                $("#tree-graph").append(function(){
                    var html = '<div id="info-tree">';
                    html += 'No relations found for <strong>"'+lemma+'"</strong> ';
                    if(where == "db") html += 'in the dataset';
                    if(where == "bucket") html += 'in the selected bucket';
                    html += '</div>';
                    return html;
                });
            }

            if(dataLeft.length > 0 && dataMain.length > 0){
                $("#tree-graph").append(function(){
                    var html = '<div id="toggle-tree">';
                    html += '<div>Toggle Tree</div>';
                    html += '</div>';
                    return html;
                })

                $("#toggle-tree").on("click", function(){
                    if(d3.select("#tree-graph-right").classed("hidden") == true){
                        d3.select("#tree-graph-right").classed("hidden",false);
                        $("#tree-graph-right").show();
                        $("#info-tree").html(function(){
                            var html = 'Showing relations for <strong>"'+lemma+'"</strong> as <strong>main</strong> lemma';
                            return html;
                        })
                    }
                    else{
                        d3.select("#tree-graph-right").classed("hidden",true);
                        $("#tree-graph-right").hide();
                        $("#info-tree").html(function(){
                            var html = 'Showing relations for <strong>"'+lemma+'"</strong> as <strong>left</strong> lemma';
                            return html;
                        })
                    }
                })
            }

            generatingTree = false;
        });
    }

    mainExports.generateTreeGraphForLemma = generateTreeGraphForLemma;

    function generateTreeSide(lemma, data, side){

        var treeData = {
            "name" : lemma,
            "children" : []
        };

        _.forEach(data, function(hit){
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
        var maxRelationsFirstLevel = 0;
        var maxRelationsSecondLevel = 0;

        // size of the diagram
        var viewerWidth = $("#tree-graph").width();
        var viewerHeight = $("#tree-graph").height();

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
            maxLabelLength = Math.max(d.name.length, maxLabelLength);
        }, function(d) {
            return d.children && d.children.length > 0 ? d.children : null;
        });


        // sort the tree according to the node names

        function sortTree() {
            // tree.sort(function(a, b) {
            //     return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
            // });
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
                d3.select(domNode).select('g.node-tree').attr("transform", "translate(" + translateX + "," + translateY + ")");
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
            //     draggingNode = d;
            //     d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
            //     d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
            //     d3.select(domNode).attr('class', 'node activeDrag');
            //
            //     svgGroup.selectAll("g.node").sort(function(a, b) { // select the parent and sort the path's
            //     if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
            //     else return -1; // a is the hovered element, bring "a" to the front
            // });
            // // if nodes has children, remove the links and nodes
            // if (nodes.length > 1) {
            //     // remove link paths
            //     links = tree.links(nodes);
            //     nodePaths = svgGroup.selectAll("path.link")
            //     .data(links, function(d) {
            //         return d.target.id;
            //     }).remove();
            //     // remove child nodes
            //     nodesExit = svgGroup.selectAll("g.node")
            //     .data(nodes, function(d) {
            //         return d.id;
            //     }).filter(function(d, i) {
            //         if (d.id == draggingNode.id) {
            //             return false;
            //         }
            //         return true;
            //     }).remove();
            // }
            //
            // // remove parent link
            // parentLink = tree.links(tree.nodes(draggingNode.parent));
            // svgGroup.selectAll('path.link').filter(function(d, i) {
            //     if (d.target.id == draggingNode.id) {
            //         return true;
            //     }
            //     return false;
            // }).remove();
            //
            // dragStarted = null;
        }

        // define the baseSvg, attaching a class for styling and the zoomListener
        var baseSvg = d3.select("#tree-graph-"+side).append("svg")
            .attr("width", viewerWidth)
            .attr("height", viewerHeight)
            .attr("class", "overlaysvg "+side)
            .attr("id", "treesvg"+side)
            .call(zoomListener);

        // Define the drag listeners for drag/drop behaviour of nodes.
        dragListener = d3.behavior.drag()
            .on("dragstart", function(d) {
                // if (d == root) {
                //     return;
                // }
                // dragStarted = true;
                // nodes = tree.nodes(d);
                // d3.event.sourceEvent.stopPropagation();
                // // it's important that we suppress the mouseover event on the node being dragged. Otherwise it will absorb the mouseover event and the underlying node will not detect it d3.select(this).attr('pointer-events', 'none');
            })
            .on("drag", function(d) {
                // if (d == root) {
                //     return;
                // }
                // if (dragStarted) {
                //     domNode = this;
                //     initiateDrag(d, domNode);
                // }
                //
                // // get coords of mouseEvent relative to svg container to allow for panning
                // relCoords = d3.mouse($('svg').get(0));
                // if (relCoords[0] < panBoundary) {
                //     panTimer = true;
                //     pan(this, 'left');
                // } else if (relCoords[0] > ($('svg').width() - panBoundary)) {
                //
                //     panTimer = true;
                //     pan(this, 'right');
                // } else if (relCoords[1] < panBoundary) {
                //     panTimer = true;
                //     pan(this, 'up');
                // } else if (relCoords[1] > ($('svg').height() - panBoundary)) {
                //     panTimer = true;
                //     pan(this, 'down');
                // } else {
                //     try {
                //         clearTimeout(panTimer);
                //     } catch (e) {
                //
                //     }
                // }
                //
                // d.x0 += d3.event.dy;
                // d.y0 += d3.event.dx;
                // var node = d3.select(this);
                // node.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
                // updateTempConnector();
            }).on("dragend", function(d) {
                // if (d == root) {
                //     return;
                // }
                // domNode = this;
                // if (selectedNode) {
                //     // now remove the element from the parent, and insert it into the new elements children
                //     var index = draggingNode.parent.children.indexOf(draggingNode);
                //     if (index > -1) {
                //         draggingNode.parent.children.splice(index, 1);
                //     }
                //     if (typeof selectedNode.children !== 'undefined' || typeof selectedNode._children !== 'undefined') {
                //         if (typeof selectedNode.children !== 'undefined') {
                //             selectedNode.children.push(draggingNode);
                //         } else {
                //             selectedNode._children.push(draggingNode);
                //         }
                //     } else {
                //         selectedNode.children = [];
                //         selectedNode.children.push(draggingNode);
                //     }
                //     // Make sure that the node being added to is expanded so user can see added node is correctly moved
                //     expand(selectedNode);
                //     sortTree();
                //     endDrag();
                // } else {
                //     endDrag();
                // }
            });

        function endDrag() {
            // selectedNode = null;
            // d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
            // d3.select(domNode).attr('class', 'node');
            // // now restore the mouseover event or we won't be able to drag a 2nd time
            // d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
            // updateTempConnector();
            // if (draggingNode !== null) {
            //     update(root);
            //     centerNode(draggingNode);
            //     draggingNode = null;
            // }
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
            var link = svgGroup.selectAll(".templink-tree").data(data);

            link.enter().append("path")
                .attr("class", "templink-tree")
                .attr("d", d3.svg.diagonal())
                .attr('pointer-events', 'none');

            link.attr("d", d3.svg.diagonal());

            link.exit().remove();
        };

        // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

        function centerNode(source) {
            //if(source.name == lemma){
            scale = zoomListener.scale();
            x = -source.y0;
            y = -source.x0;
            x = x * scale + viewerWidth / 2;
            y = y * scale + viewerHeight / 2;
            d3.select('.overlaysvg > g').transition()
                .duration(duration)
                .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
            zoomListener.scale(scale);
            zoomListener.translate([x, y]);
            //}
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
            if(d3.event != null)
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
                if(side == "left"){
                    d.y = (d.depth * (maxLabelLength * 10)); //maxLabelLength * 10px
                }
                else{
                    d.y = (viewerWidth - d.depth * (maxLabelLength * 10)); //maxLabelLength * 10px
                }
                // alternatively to keep a fixed scale one can set a fixed depth per level
                // Normalize for fixed-depth by commenting out below line
                // d.y = (d.depth * 500); //500px per level.
            });

            // Update the nodes…
            node = svgGroup.selectAll("g.node-tree")
                .data(nodes, function(d) {
                    return d.id || (d.id = ++i);
                });

            // Enter any new nodes at the parent's previous position.
            var nodeEnter = node.enter().append("g")
                .call(dragListener)
                .attr("class", "node-tree")
                .attr("transform", function(d) {
                    return "translate(" + source.y0 + "," + source.x0 + ")";
                })
                .on('click', function(d){
                    click(d);

                    // If we click a leaf, we plot it in the map
                    if(d.parent != undefined && d.parent.name != lemma){
                        if(side == "right"){plotInMap(d.name,"and",root.name);}
                        else if(side == "left"){plotInMap(root.name,"and",d.name);}
                        w2ui['content'].hide('left');
                        setTimeout(function () {
                            $("#lemma-graph").html("");
                            clickedGeoHash = "";
                            cartoMap.refresh();
                        }, 500);
                        showHideLemmaList(false);
                        tooltip.hide();
                    }
                })
                .on("mouseover", function(d,i){

                    d3.selection.prototype.moveToFront = function() {
                        return this.each(function(){
                            this.parentNode.appendChild(this);
                        });
                    };

                    d3.selection.prototype.moveToBack = function() {
                        return this.each(function() {
                            var firstChild = this.parentNode.firstChild;
                            if (firstChild) {
                                this.parentNode.insertBefore(this, firstChild);
                            }
                        });
                    };

                    // Highlight the links between the root and the active node
                    var nodeParentName = "";
                    if(d.parent != undefined){nodeParentName = d.parent.name;}
                    var nodeName = d.name;
                    var links = d3.selectAll(".link-tree");
                    _.forEach(links[0], function(link){
                        if(d.name == lemma) return;
                        // Me with parent
                        if(link.__data__.source.name == d.parent.name && link.__data__.target.name == d.name){
                            //d3.select(link).moveToFront();
                            d3.select(link).style("stroke","#2b91fc");
                        }
                        // Parent with root
                        if(d.parent.name != lemma){
                            if(link.__data__.source.name == lemma && link.__data__.target.name == d.parent.name){
                                //d3.select(link).moveToFront();
                                d3.select(link).style("stroke","#2b91fc");
                            }
                        }
                    });

                    if(d.parent != undefined && d.parent.name != lemma){
                        tooltipYmodifier = 20;
                        tooltip.html(function(){
                            var html = "";
                            if(side == "right"){
                                html += 'Click to plot <strong>('+d.name+')'+lemma+'</strong> in the map';
                                html += '<br><span>* There may be no results</span>';
                            }
                            else if(side == "left"){
                                html += 'Click to plot <strong>('+lemma+')'+d.name+'</strong> in the map';
                                html += '<br><span>* There may be no results</span>';
                            }
                            return html;
                        });

                        tooltip.show();
                    }

                    if(d.years != undefined && d.years.length > 0){
                        setTimeout(function () {
                            // Highlight related years in timeline
                            timelineChart.selectAll('rect.bar').each(function(dBar){
                                if(d.years.indexOf(parseInt(dBar.x)) > -1){
                                    d3.select(this)/*.transition().duration(500)*/.style("fill", "#2b91fc");
                                }
                                else {
                                    d3.select(this)/*.transition().duration(500)*/.style("fill", "black");
                                }
                            });
                        }, 100);
                    }
                })
                .on("mouseout", function(d){
                    var links = d3.selectAll(".link-tree");
                    _.forEach(links[0], function(link){
                        d3.select(link).style("stroke","#ccc");
                    });
                    tooltip.hide();
                    resetTimelineColor(0);
                });

            nodeEnter.append("circle")
                .attr('class', 'nodeCircle-tree')
                .attr("r", 0)
                .style("fill", function(d) {
                    return d._children ? "lightsteelblue" : "#fff";
                });

            nodeEnter.append("text")
                .attr("x", function(d) {
                    if(side == "left"){
                        return d.children || d._children ? -10 : 10;
                    }
                    else{
                        return d.children || d._children ? 10 : -10;
                    }
                })
                .attr("dy", ".35em")
                .attr('class', 'nodeText-tree')
                .attr("text-anchor", function(d) {
                    if(side == "left"){
                        return d.children || d._children ? "end" : "start";
                    }
                    else{
                        return d.children || d._children ? "start" : "end";
                    }
                })
                .text(function(d) {
                    if(d.count != undefined){
                        return d.name + " ("+d.count+")";
                    }
                    else{
                        return d.name;
                    }

                })
                .style("fill-opacity", 0);

            // phantom node to give us mouseover in a radius around it
            nodeEnter.append("circle")
                .attr('class', 'ghostCircle-tree')
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
                    if(side == "left"){
                        return d.children || d._children ? -10 : 10;
                    }
                    else{
                        return d.children || d._children ? 10 : -10;
                    }
                })
                .attr("text-anchor", function(d) {
                    if(side == "left"){
                        return d.children || d._children ? "end" : "start";
                    }
                    else{
                        return d.children || d._children ? "start" : "end";
                    }
                })
                .text(function(d) {
                    if(d.count != undefined){
                        return d.name + " ("+d.count+")";
                    }
                    else{
                        return d.name;
                    }
                });

            // Change the circle fill depending on whether it has children and is collapsed
            node.select("circle.nodeCircle-tree")
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
            var link = svgGroup.selectAll("path.link-tree")
                .data(links, function(d) {
                    return d.target.id;
                });

            // Enter any new links at the parent's previous position.
            link.enter().insert("path", "g")
                .attr("class", "link-tree")
                .attr("d", function(d) {
                    var o = {
                        x: source.x0,
                        y: source.y0
                    };
                    return diagonal({
                        source: o,
                        target: o
                    });
                })
                .style("stroke-width",function(d){
                    var firstLevelStrokeScale = d3.scale.linear()
                        .domain([1,maxRelationsFirstLevel])
                        .range([1,8]);
                    var secondLevelStrokeScale = d3.scale.linear()
                        .domain([1,maxRelationsSecondLevel])
                        .range([1.5,8]);

                    if(d.source.name == lemma && d.target.children != undefined){ // 1st level
                        return firstLevelStrokeScale(d.target.children.length)+"px";
                    }
                    else { // 2nd level
                        return secondLevelStrokeScale(d.target.count)+"px";
                    }
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
        if(side == "left"){
            root.y0 = 0;
        }
        else {
            root.y0 = viewerWidth;
        }

        // Layout the tree initially and center on the root node.
        update(root);
        centerNode(root);

        root.children.forEach(collapseAll);

        function collapseAll(d) {
            if (d.children) {
                d.children.forEach(collapseAll);
                toggleChildren(d);
            }
        }

        for(var i=0; i<root.children.length; i++){
            if(root.children[i]._children.length > maxRelationsFirstLevel){
                maxRelationsFirstLevel = root.children[i]._children.length;
            }
        }

        for(var i=0; i<root.children.length; i++){
            for(var j=0; j<root.children[i]._children.length; j++){
                if(root.children[i]._children[j].count > maxRelationsSecondLevel){
                    maxRelationsSecondLevel = root.children[0]._children[j].count;
                }
            }
        }

        click(root);
        setTimeout(function () {
            click(root);
            updateLinkWeights();
        }, 1000);

        function updateLinkWeights(){

            // Compute the new tree layout.
            var nodes = tree.nodes(root).reverse(),
                links = tree.links(nodes);

            var link = svgGroup.selectAll("path.link-tree")
                .data(links, function(d) {
                    return d.target.id;
                }).style("stroke-width",function(d){

                    var firstLevelStrokeScale = d3.scale.linear()
                        .domain([1,maxRelationsFirstLevel])
                        .range([1,8]);
                    var secondLevelStrokeScale = d3.scale.linear()
                        .domain([1,maxRelationsSecondLevel])
                        .range([1.5,8]);

                    if(d.source.name == lemma){ // 1st level
                        return firstLevelStrokeScale(d.target._children.length)+"px";
                    }
                    else { // 2nd level
                        return secondLevelStrokeScale(d.target.count)+"px";
                    }
                });
        }
    }


    function getDataFromElastic() {
        var body;
        var temp = !$("#nontemporal-checkbox").is(":checked");

        if (temp) {
            body = {
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
                                    "min_doc_count": 1
                                }
                            }
                        }
                    },
                    "yearsMain": {
                        "date_histogram": {
                            "field": "startYear",
                            "interval": (365*yearResolution)+"d",
                            "time_zone": "Europe/Berlin",
                            "min_doc_count": 1
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
        } else {
            body = {
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
                                    "min_doc_count": 1
                                }
                            },
                            "noYear": {
                                "missing": { "field" : "startYear"}
                            }
                        }
                    }
                }
            };
        }


        if ((filterMain.val() == undefined || filterMain.val().length == 0) && (filterLeft.val() == undefined || filterLeft.val().length == 0)){
            body["query"] = getQueryObjectForParams(null, null, "and", null, temp);
        }
        else{
            if($("#lemma-and-or-selector option:selected").val() == "and"){
                body["query"] = getQueryObjectForParams(filterMain.val(), filterLeft.val(), "and", null, temp);
            }
            else{
                body["query"] = getQueryObjectForParams(filterMain.val(), filterLeft.val(), "or", null, temp);
            }
        }

        if (!filterMain.val() && !filterLeft.val())
            body["size"] = 0;

        return esClient.search({
            index: indexName,
            body: body
        });
    }


    function getLemmasInGeoHashBucket(geo_hash) {

        var queryObj;
        var tempOnly = !$("#nontemporal-checkbox").is(":checked");

        if ((filterMain.val() !== undefined && filterMain.val().length !== 0) || (filterLeft.val() !== undefined && filterLeft.val().length !== 0)){
            if($("#lemma-and-or-selector option:selected").val() == "and"){
                queryObj = getQueryObjectForParams(filterMain.val(), filterLeft.val(), "and", geo_hash, tempOnly);
            }
            else{
                queryObj = getQueryObjectForParams(filterMain.val(), filterLeft.val(), "or", geo_hash, tempOnly);
            }
        } else {
            queryObj = getQueryObjectForParams(null, null, "and", geo_hash, tempOnly);
        }

        var body = {
            "size": 0,
            "query": queryObj,
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
                            },
                            "aggs": {
                                "years": {
                                    "date_histogram": {
                                        "field": "startYear",
                                        "interval": (365*yearResolution)+"d",
                                        "time_zone": "Europe/Berlin",
                                        "min_doc_count": 1
                                    }
                                }
                            }
                        },
                        "years": {
                            "date_histogram": {
                                "field": "startYear",
                                "interval": (365*yearResolution)+"d",
                                "time_zone": "Europe/Berlin",
                                "min_doc_count": 1
                            }
                        }
                    }
                },
            }
        };

        return esClient.search({
            index: indexName,
            body: body
        });
    }

    function getAllRecordsForWord(word,where) {

        word = filterSearchString(word);
        var boolBlock = {};

        // // We're looking only at cases with the specified mainLemma AND leftLemma
        // if(filterMain.val() != "" && filterLeft.val() != ""){
        //     if(where == "db"){ // Fetch from all database
        //         boolBlock = {
        //             "must": [
        //                 {
        //                     "query_string":{
        //                         "default_field": "mainLemma",
        //                         "query": filterMain.val()
        //                     }
        //                 },
        //                 {
        //                     "query_string":{
        //                         "default_field": "leftLemma",
        //                         "query": filterLeft.val()
        //                     }
        //                 }
        //             ]
        //         }
        //     }
        //     else if(where == "bucket"){ // Fetch only from the selected bucket
        //         boolBlock = {
        //             "must": [
        //                 {
        //                     "prefix": {
        //                         "gisOrt.geohash": clickedGeoHash
        //                     }
        //                 },
        //                 {
        //                     "query_string":{
        //                         "default_field": "mainLemma",
        //                         "query": filterMain.val()
        //                     }
        //                 },
        //                 {
        //                     "query_string":{
        //                         "default_field": "leftLemma",
        //                         "query": filterLeft.val()
        //                     }
        //                 }
        //             ]
        //         }
        //     }
        // }
        //
        // // We're looking only at cases with the specified mainLemma
        // else if(filterMain.val() != "" && filterLeft.val() == ""){
        //     if(where == "db"){ // Fetch from all database
        //         boolBlock = {
        //             "must": [
        //                 {
        //                     "query_string":{
        //                         "default_field": "mainLemma",
        //                         "query": filterMain.val()
        //                     }
        //                 },
        //                 {
        //                     "query_string":{
        //                         "default_field": "leftLemma",
        //                         "query": word
        //                     }
        //                 }
        //             ]
        //         }
        //     }
        //     else if(where == "bucket"){ // Fetch only from the selected bucket
        //         boolBlock = {
        //             "must": [
        //                 {
        //                     "prefix": {
        //                         "gisOrt.geohash": clickedGeoHash
        //                     }
        //                 },
        //                 {
        //                     "query_string":{
        //                         "default_field": "mainLemma",
        //                         "query": filterMain.val()
        //                     }
        //                 },
        //                 {
        //                     "query_string":{
        //                         "default_field": "leftLemma",
        //                         "query": word
        //                     }
        //                 }
        //             ]
        //         }
        //     }
        // }
        //
        // // We're looking only at cases with the specified leftLemma
        // else if(filterMain.val() == "" && filterLeft.val() != ""){
        //     if(where == "db"){ // Fetch from all database
        //         boolBlock = {
        //             "must": [
        //                 {
        //                     "query_string":{
        //                         "default_field": "mainLemma",
        //                         "query": word
        //                     }
        //                 },
        //                 {
        //                     "query_string":{
        //                         "default_field": "leftLemma",
        //                         "query": filterLeft.val()
        //                     }
        //                 }
        //             ]
        //         }
        //     }
        //     else if(where == "bucket"){ // Fetch only from the selected bucket
        //         boolBlock = {
        //             "must": [
        //                 {
        //                     "prefix": {
        //                         "gisOrt.geohash": clickedGeoHash
        //                     }
        //                 },
        //                 {
        //                     "query_string":{
        //                         "default_field": "mainLemma",
        //                         "query": word
        //                     }
        //                 },
        //                 {
        //                     "query_string":{
        //                         "default_field": "leftLemma",
        //                         "query": filterLeft.val()
        //                     }
        //                 }
        //             ]
        //         }
        //     }
        // }
        //
        // // Basic case, no search filter is applied
        // else if(filterMain.val() == "" && filterLeft.val() == ""){
        //     if(where == "db"){ // Fetch from all database
        //         boolBlock = {
        //             "should": [
        //                 {
        //                     "query_string": {
        //                         "default_field": "mainLemma",
        //                         "query": word
        //                     }
        //                 },
        //                 {
        //                     "query_string": {
        //                         "default_field": "leftLemma",
        //                         "query": word
        //                     }
        //                 }
        //             ],
        //             "minimum_should_match" : 1
        //         }
        //     }
        //     else if(where == "bucket"){ // Fetch only from the selected bucket
        //         boolBlock = {
        //             "must": [{
        //                 "prefix": {
        //                     "gisOrt.geohash": clickedGeoHash
        //                 }
        //             }],
        //             "should": [
        //                 {
        //                     "query_string": {
        //                         "default_field": "mainLemma",
        //                         "query": word
        //                     }
        //                 },
        //                 {
        //                     "query_string": {
        //                         "default_field": "leftLemma",
        //                         "query": word
        //                     }
        //                 }
        //             ],
        //             "minimum_should_match" : 1
        //         }
        //     }
        // }

        if(where == "db"){ // Fetch from all database
            boolBlock = {
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
                ],
                "minimum_should_match" : 1
            }
        }
        else if(where == "bucket"){ // Fetch only from the selected bucket
            boolBlock = {
                "must": [{
                    "prefix": {
                        "gisOrt.geohash": clickedGeoHash
                    }
                }],
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
                ],
                "minimum_should_match" : 1
            }
        }

        return esClient.search({
            index: indexName,
            body: {
                size: 10000,
                query: {
                    bool: boolBlock
                }
            }
        });
    }


    function getSingleRecordFullData(){

        var leftLemma = filterLeft.val();
        var mainLemma = filterMain.val();

        if (mainLemma) {mainLemma = filterSearchString(mainLemma);}
        if (leftLemma) {leftLemma = filterSearchString(leftLemma);}

        var boolBlock = {};

        boolBlock = {
            "must": [
                {
                    "prefix": {
                        "gisOrt.geohash": clickedGeoHash
                    }
                }
            ],
            "should" : [],
            "minimum_should_match" : 0
        };

        if($("#lemma-and-or-selector").val() == "and"){
            if(mainLemma != ""){
                boolBlock.must.push(
                    {
                        "query_string": {
                            "default_field": "mainLemma",
                            "query": mainLemma
                        }
                    }
                );
            }
            if(leftLemma != ""){
                boolBlock.must.push(
                    {
                        "query_string": {
                            "default_field": "leftLemma",
                            "query": leftLemma
                        }
                    }
                );
            }
        }

        else if($("#lemma-and-or-selector").val() == "or"){
            boolBlock.minimum_should_match = 1;
            if(mainLemma != ""){
                boolBlock.should.push(
                    {
                        "query_string": {
                            "default_field": "mainLemma",
                            "query": mainLemma
                        }
                    }
                );
            }
            if(leftLemma != ""){
                boolBlock.should.push(
                    {
                        "query_string": {
                            "default_field": "leftLemma",
                            "query": leftLemma
                        }
                    }
                );
            }
        }

        return esClient.search({
            index: indexName,
            body: {
                size: 10000,
                query: {
                    bool: boolBlock
                }
            }
        });
    }


    function filterSearchString(string) {
        var pattern = /\{|<|>|:|}|\$|\^/g;
        if (string)
            return string.replace(pattern, '?');
        else return null;
    }

    function getQueryObjectForParams(mainLemma, leftLemma, andOr, geohash, temp_only) {

        if (mainLemma) {
            mainLemma = filterSearchString(mainLemma);
        }

        if (leftLemma) {
            leftLemma = filterSearchString(leftLemma);
        }

        var queryArray = [];

        if (mainLemma && mainLemma !== undefined && mainLemma.length !== 0) {
            queryArray.push({
                "query_string": {
                    "default_field": "mainLemma.raw",
                    "query": mainLemma
                }
            });
        }

        if (leftLemma && leftLemma !== undefined && leftLemma.length !== 0) {
            queryArray.push({
                "query_string": {
                    "default_field": "leftLemma.raw",
                    "query": leftLemma
                }
            })
        }

        if (queryArray.length == 0) {
            if (temp_only) {
                queryArray.push( {
                    "exists": {
                        "field": "startYear"
                    }
                });
                if (geohash) {
                    queryArray.push({"prefix": {
                        "gisOrt.geohash": geohash
                    }});
                }
                return {
                    "bool" : {"must": queryArray}
                };
            } else if (geohash) {
                queryArray.push({"prefix": {
                    "gisOrt.geohash": geohash
                }});
                return {
                    "bool" : {"must": queryArray}
                };
            } else {
                return {"match_all" : {}}
            }
        }

        if (queryArray.length == 1) {
            if (geohash) {
                queryArray.push({"prefix": {
                    "gisOrt.geohash": geohash
                }});
            }
            if (temp_only) {
                queryArray.push( {
                    "exists": {
                        "field": "startYear"
                    }
                });
            }
            return {
                "bool" : {"must": queryArray}
            };
        }

        if (queryArray.length == 2) {
            if (andOr == "and") {
                if (geohash) {
                    queryArray.push({
                        "prefix": {
                            "gisOrt.geohash": geohash
                        }
                    });
                }
                if (temp_only) {
                    queryArray.push( {
                        "exists": {
                            "field": "startYear"
                        }
                    });
                }
                return {
                    "bool" : {"must": queryArray}
                };
            } else {
                if (geohash) {
                    if (temp_only) {
                        return {
                            "bool" : {
                                "must": [{
                                    "prefix": {
                                        "gisOrt.geohash": geohash
                                    }
                                },
                                    {
                                        "exists": {
                                            "field": "startYear"
                                        }
                                    }],
                                "should": queryArray,
                                "minimum_should_match": 1
                            }
                        };
                    } else {
                        return {
                            "bool" : {
                                "must": [{
                                    "prefix": {
                                        "gisOrt.geohash": geohash
                                    }
                                }],
                                "should": queryArray,
                                "minimum_should_match": 1

                            }
                        };
                    }
                    return {
                        "bool" : {"must": queryArray}
                    };
                } else {
                    if (temp_only) {
                        return {
                            "bool" : {
                                "must": [{
                                    "exists": {
                                        "field": "startYear"
                                    }
                                }],
                                "should": queryArray,
                                "minimum_should_match": 1
                            }
                        }
                    } else {
                        return {
                            "bool" : {
                                "should": queryArray,
                                "minimum_should_match": 1
                            }
                        };}
                }
            }
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
                    }
                }
            }
        };

        return esClient.search({
            index: indexName,
            body: body
        });
    }

    function refreshColorLegend(geoFeatures, colorScale){

        $("#legend-graph").html("");
        var svg = d3.select("#legend-graph").append("svg")
            .attr("width", '212px')
            .attr("height", '35px');

        svg.append("g")
            .attr("class", "legendLinear");

        var numCellsLegend = 0;
        var pluckCounts = [];
        _.forEach(geoFeatures,function(feature){
            pluckCounts.push(feature.properties.doc_count);
        });
        pluckCounts = _.unique(pluckCounts);
        if(pluckCounts.length > 5){numCellsLegend = 5;}
        else {numCellsLegend = pluckCounts.length;}

        if(numCellsLegend < 2){
            $("#legend-holder").hide();
        }
        else {
            $("#legend-holder").show();
        }

        var legendLinear = d3.legend.color()
            .shapeWidth(40)
            .shapePadding(3)
            .cells(numCellsLegend)
            .labelFormat(d3.format("f"))
            .labelOffset(4)
            .orient('horizontal')
            .scale(colorScale);

        svg.select(".legendLinear")
            .call(legendLinear);
    }

    function resetTimelineColor(waitingTime){
        setTimeout(function () {
            timelineChart.selectAll('rect.bar').each(function(dBar){
                d3.select(this)/*.transition().duration(500)*/.style("fill", "black");
            });
        }, 0/*waitingTime*/);
    }

    function showHideLemmaList(show){
        if(show){
            if(d3.select("#lemma-list-holder").classed("collapsed") == true){
                d3.select("#lemma-list-holder").classed("collapsed",false);
                $("#lemma-list-handle").html("&raquo;");
                $("#lemma-list-handle").show();
            }
        }
        else{
            if(d3.select("#lemma-list-holder").classed("collapsed") != true){
                d3.select("#lemma-list-holder").classed("collapsed",true);
                $("#lemma-list-handle").html("&laquo;");
                setTimeout(function () {
                    $("#lemma-list-handle").hide();
                }, 350);
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
