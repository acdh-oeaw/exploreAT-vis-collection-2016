var cartoMap;
(function() {


    var esClient = new $.es.Client({
        hosts: "http:\/\/localhost:9200\/"
    });

    var geohashBuckets = [];
    var zoom = 8;

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

    cartoMap.setScale(6);

    cartoMap.centerOn([13.333333, 47.333333],"latlong");

    update();


    function update() {
        getDataForZoomLevel(zoom)
            .then(function(resp) {
                var features = generateFeatures(resp);

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
            });
    }


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
