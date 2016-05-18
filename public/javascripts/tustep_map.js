var cartoMap;
(function() {


    var esClient = new $.es.Client({
        hosts: "http:\/\/localhost:9200\/"
    });

    var geohashBuckets = [];
    var zoom = 8;

    var geohashFeatures;



    // var map = L.map('map').setView([47.333333, 13.333333], 7);
    // var mapLink =
    //     '<a href="http://openstreetmap.org">OpenStreetMap</a>';
    // L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    //     attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://exploreat.usal.es">ExploreAT!</a>',
    //     subdomains: 'abcd',
    //     maxZoom: 14,
    //     minZoom: 8,
    //     detectRetina: true
    // }).addTo(map);

    var svg,
        featureLayer;


    cartoMap = d3.carto.map();
    d3.select("#map").call(cartoMap);

    $('.zoomcontrol').bind('click', function() {
        if (this.innerHTML == '+') {
            zoom += 1;
        } else zoom -= 1;

        update();

    });


    var terrainLayer = d3.carto.layer.tile();

    terrainLayer
        .path('light_all')
        .tileType("cartodb")
        .label("Terrain");


    var geojsonLayer = d3.carto.layer.geojson();
    geojsonLayer
        .path("data/austria.json")
        .label("GeoBorders")
        .visibility(true)
        .cssClass("countryborders")
        .renderMode("svg");

    cartoMap.addCartoLayer(terrainLayer);
    cartoMap.addCartoLayer(geojsonLayer);



    d3.json("data/austria.json", function (json) {
        function style(feature) {
            return {
                fillColor: "#E3E3E3",
                weight: 1,
                opacity: 1,
                color: 'black',
                fillOpacity: 0.5,
                "pointer-events": "none"
            };
        }

        // L.geoJson(json, {
        //     // onEachFeature: onEachFeature,
        //     style: style
        // }).addTo(map);

        // function onEachFeature(feature, layer){
        //     layer.on({
        //         click : onCountryClick,
        //         mouseover : onCountryHighLight,
        //         mouseout : onCountryMouseOut
        //     });
        // }
        // L.control.scale().addTo(map);

        /* Initialize the SVG layer */
        // map._initPathRoot();

        /* We simply pick up the SVG from the map object */
        // svg = d3.select("#map").select("svg");
        // g = svg.append("g");

        // map.on("viewreset", update);
        // map.on("zoomstart", function () {
        //     g.style("opacity", .0);
        //     console.log('Zoom start');
        //
        // });
        // map.on("click", function () {
        //     console.log("mouse click");
        // });
        cartoMap.setScale(6);
        cartoMap.centerOn([13.333333, 47.333333],"latlong");

        // featureLayer = d3.carto.layer.featureArray().label("SVG Features")

        update();
    });



    function generateFeatures(resp) {
        geohashBuckets = resp.aggregations.buckets.buckets;

        return _.map(geohashBuckets, function (hash_bucket) {
            // var coordsObj = Geohash.decode(hash_bucket.key);
            // var coords = [coordsObj.lat, coordsObj.lon];

            var geohashBounds = Geohash.bounds(hash_bucket.key);
            var swCoords =geohashBounds.sw;
            var neCoords = geohashBounds.ne;

            var polygonVertex = [[]];

            polygonVertex[0][0] = [swCoords.lon, neCoords.lat];
            polygonVertex[0][1] = [neCoords.lon, neCoords.lat];
            polygonVertex[0][2] = [neCoords.lon, swCoords.lat];
            polygonVertex[0][3] = [swCoords.lon, swCoords.lat];
            polygonVertex[0][4] = [swCoords.lon, neCoords.lat];

            //d3.geom.polygon(vertices)

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



    function update() {
        getDataForZoomLevel(zoom)
            .then(function(resp) {
                var features = generateFeatures(resp);
                // var d3_features = g.selectAll(".geohashpath").data(features);

                // if (featureLayer !== undefined)
                //     cartoMap.deleteCartoLayer(featureLayer);

                // featureLayer = d3.carto.layer.featureArray().label("SVG Features")
                //     .cssClass("featureLayer")
                //     .features(features)
                //     .renderMode("svg");
                //
                // cartoMap.addCartoLayer(featureLayer);

                if (featureLayer == undefined) {
                    featureLayer = d3.carto.layer.featureArray().label("SVG Features")
                        .cssClass("featureLayer")
                        .features(features)
                        .renderMode("svg");
                    cartoMap.addCartoLayer(featureLayer);
                } else {
                    featureLayer.features(features);
                    cartoMap.refreshCartoLayer(featureLayer);
                }
                
                var minDocCount = _.min(features, function(el) {
                    return el.properties.doc_count;
                }).properties.doc_count;
                var maxDocCount = _.max(features, function(el) {
                    return el.properties.doc_count;
                }).properties.doc_count;

                // var sizeInPixels = map.getSize(map.getZoom());
                //
                // var radiusScale = d3.scale.linear()
                //     .domain([minDocCount, maxDocCount])
                //     .range([sizeInPixels.x * 0.01, sizeInPixels.x * 0.03]);

                // var transform = d3.geo.transform({point: projectPoint}),
                //     path = d3.geo.path().projection(transform);


                // d3_features.attr("transform",
                //     function(d) {
                //         return "translate("+
                //             map.latLngToLayerPoint(d.geometry.coordinates).x +","+
                //             map.latLngToLayerPoint(d.geometry.coordinates).y +")";
                //     })
                //     .attr("r", function(d){return radiusScale(d.properties.doc_count);});

                // d3_features
                //     .attr("d", path);
                //
                // d3_features.enter()
                //     .append("path")
                //     .attr("class","geohashpath")
                //     .attr("d", path)
                //     .style("fill-opacity", 0.7)
                //     .attr('fill','blue');

                // d3_features
                //     .enter()
                //     .append("a")
                //     .attr("transform",
                //         function(d) {
                //             return "translate("+
                //                 map.latLngToLayerPoint(d.geometry.coordinates).x +","+
                //                 map.latLngToLayerPoint(d.geometry.coordinates).y +")";
                //         }
                //     ).style("stroke", "black")
                //     .style("opacity", .6)
                //     .style("fill", "red")
                //     .attr("r", function(d){return radiusScale(d.properties.doc_count);})
                //     .on('mouseover', function() {console.log('mouseover')});




                // g.style("opacity", 1);

                // d3_features.exit().remove();
            });
    }

    // function projectPoint(x, y) {
    //     var point = map.latLngToLayerPoint(new L.LatLng(x, y));
    //     this.stream.point(point.x, point.y);
    // }

    function getDataForZoomLevel(zoomLevel) {

        return esClient.search({
            index: 'tustepgeo2',
            body: {
                "size": 0,
                "query": {
                    "match_all": {}
                },
                "aggs": {
                    "buckets": {
                        "geohash_grid": {
                            "field": "gisOrt",
                            "precision": zoomLevel - 5
                        }
                    }
                }
            }
        });
    }


})();
