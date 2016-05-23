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

    // MAP VARIABLES + INITIALIZATION

    var zoom = 7;
    var svg;
    var geoFeaturesLayer;


    var filterMain,
        filterLeft;



    cartoMap = d3.carto.map();
    d3.select("#map").call(cartoMap);

    // TILES + COUNTRY BORDERS

    var terrainLayer = d3.carto.layer.tile();
    terrainLayer
        .path('light_all')
        .tileType("cartodb")
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
    cartoMap.centerOn([13.333333, 47.333333],"latlong");

    // GEO BUCKETS SCALE/PRECISION CONTROL

    $('.zoomcontrol').bind('click', function() {
        if (this.innerHTML == '+') {
            zoom += 1;
        } else zoom -= 1;

        update();
    });

    // APP START (First update)
    d3.select("#livesearch-box").append("form")
        .attr("id", "live-search")
        .attr("class", "searchBox")
        .attr("class", "overmap")
        .html("<fieldset> " +
            "<input type=\"text\" class=\"text-input\" id=\"filterMain\" placeholder=\"Search by main lemma\" value=\"\" style=\"width: 200px\"/> " +
            "<input type=\"text\" class=\"text-input\" id=\"filterLeft\" placeholder=\"Search by left lemma\" value=\"\" style=\"width: 200px\"/>" +
            "</fieldset>")
        .on("keyup", function() {
            console.log(filterMain.val());
            console.log(filterLeft.val());
            update();
        });

    filterMain = $("#filterMain");
    filterLeft = $("#filterLeft");


    update();

    function update() {
        getDataForZoomLevel()
            .then(function(resp) {
                if (resp.aggregations.length !== 0) {
                    createDataStructure(resp);
                    refreshCrossfilter();
                    refreshGeoFeatures();
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
    }

    function refreshCrossfilter(){

        if(ndx == null){
            ndx = crossfilter(tustepData);

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


        }
        else{
            resetCrossfilterData();
        }
    }

    function resetCrossfilterData() {
        var timelineFilters = timelineChart.filters();
        timelineChart.filter(null);
        ndx.remove();
        timelineChart.filter([timelineFilters]);
        ndx.add(tustepData);
        // dc.redrawAll();
    }

    function appendTimeline(){
        var margins = {top: 10, right: 60, bottom: 20, left: 60};
        timelineChart
            .width(parseInt(d3.select('#timeline-holder').style('width'), 10))
            .height(100)
            .dimension(yearDim)
            .group(groupOfDocsPerYear)
            .valueAccessor(function(p) { return p.value.sum; })
            .x(d3.scale.linear().domain([
                yearDim.top(Infinity)[yearDim.top(Infinity).length-1].year, // minYear
                yearDim.top(Infinity)[1].year // maxYear
            ]))
            //.elasticY(true)
            .centerBar(true)
            .barPadding(2)
            .margins(margins);
        timelineChart.xAxis().tickValues(_.unique(_.pluck(yearDim.top(Infinity),"year")).sort().filter(function(el, index) {return index % 20 === 1;}));
        //yearChart.yAxis().tickValues(0);

        timelineChart.on('renderlet', function () {
            refreshGeoFeatures();
        });

        d3.selectAll('a#timeline-reset').on('click', function () {
            timelineChart.filterAll();
            dc.redrawAll();
        });

        dc.renderAll();
    }

    function refreshGeoFeatures(){
        // var geoFeatures = generateGeoFeatures(resp);
        var geoFeatures = generateCrossGeoFeatures();
        //generateTimeline(resp);

        if (geoFeatures && geoFeatures.length > 0) {
            var minDocCount = _.min(geoFeatures, function(el) {
                return el.properties.doc_count;
            }).properties.doc_count;

            var docCountMean = d3.mean(geoFeatures, function (el) {
                return el.properties.doc_count;
            });

            var maxDocCount = _.max(geoFeatures, function(el) {
                return el.properties.doc_count;
            }).properties.doc_count;

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
        }

        if (geoFeaturesLayer == undefined) {
            geoFeaturesLayer = d3.carto.layer.featureArray().label("Word Buckets")
                .cssClass("featureLayer")
                .features(geoFeatures)
                .renderMode("svg")
                .on("load", colorByCount)
                .clickableFeatures(true);
            cartoMap.addCartoLayer(geoFeaturesLayer);
        } else {
            geoFeaturesLayer
                .features(geoFeatures)
                .clickableFeatures(true);
            cartoMap.refreshCartoLayer(geoFeaturesLayer);
            if (geoFeatures.length > 0)
                colorByCount(minDocCount, docCountMean, maxDocCount);
        }
    }

    function generateCrossGeoFeatures() {

        geohashBuckets = [];
        var hashStringArray = _.unique(_.pluck(yearDim.top(Infinity),"hash"));

        _.each(hashStringArray,function(hash){
            var entriesForHash = _.filter(yearDim.top(Infinity), function(entry){
                return entry.hash == hash;
            });

            var geoObject = {};
            geoObject.key = hash;
            geoObject.doc_count = 0;
            _.each(entriesForHash, function(entry){
                geoObject.doc_count += parseInt(entry.docs);
            });

            if(geoObject.doc_count > 0)
                geohashBuckets.push(geoObject);
        });

        return _.map(geohashBuckets, function (hash_bucket) {

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

    function getDataForZoomLevel() {

        var body = {
            "aggs": {
                "ortMain": {
                    "geohash_grid": {
                        "buckets_path": "years",
                        "field": "gisOrt",
                        "precision": zoom - 4
                    },
                    "aggs": {
                        "years": {
                            "date_histogram": {
                                "field": "startYear",
                                "interval": "365d",
                                "time_zone": "Europe/Berlin",
                                "min_doc_count": 0
                            }
                        }
                    }
                },
                "yearsMain": {
                    "date_histogram": {
                        "field": "startYear",
                        "interval": "1826d",
                        "time_zone": "Europe/Berlin",
                        "min_doc_count": 0
                    },
                    "aggs": {
                        "ort": {
                            "geohash_grid": {
                                "buckets_path": "years",
                                "field": "gisOrt",
                                "precision": zoom - 4
                            }
                        }
                    }
                }
            }
        };

        body["query"] = getQueryObjectForParams(filterMain.val(), filterLeft.val());

        if (filterMain.val() && filterLeft.val() == 0)
            body["size"] = 0;

        return esClient.search({
            index: 'tustepgeo2',
            body: body
        });
    }


})();
