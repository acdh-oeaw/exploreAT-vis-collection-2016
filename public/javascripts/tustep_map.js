var cartoMap;
(function() {


    var esClient = new $.es.Client({
        hosts: "http:\/\/localhost:9200\/"
    });

    var zoom = 7;

    var svg,
        geoFeaturesLayer;


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

    update();


    function update() {
        getDataForZoomLevel(zoom)
            .then(function(resp) {

                var geoFeatures = generateGeoFeatures(resp);

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
                        .style("fill", function (d) { return colorScale(d.properties.doc_count);});
                }

                if (geoFeaturesLayer == undefined) {
                    geoFeaturesLayer = d3.carto.layer.featureArray().label("Word Buckets")
                        .cssClass("featureLayer")
                        .features(geoFeatures)
                        .renderMode("svg")
                        .on("load", colorByCount);
                    cartoMap.addCartoLayer(geoFeaturesLayer);
                } else {
                    geoFeaturesLayer.features(geoFeatures);
                    cartoMap.refreshCartoLayer(geoFeaturesLayer);
                    colorByCount(minDocCount, docCountMean,     maxDocCount);
                }
            });
    }


    function generateGeoFeatures(resp) {
        var geohashBuckets = resp.aggregations.ortMain.buckets;

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
                "ortMain": {
                  "geohash_grid": {
                    "buckets_path": "years",
                    "field": "gisOrt",
                    "precision": zoomLevel - 4
                  },
                  "aggs": {
                    "years": {
                      "date_histogram": {
                        "field": "startYear",
                        "interval": "1826d",
                        "time_zone": "Europe/Berlin",
                        "min_doc_count": 1
                      }
                    }
                  }
                },
                "yearsMain": {
                  "date_histogram": {
                    "field": "startYear",
                    "interval": "1826d",
                    "time_zone": "Europe/Berlin",
                    "min_doc_count": 1
                  },
                  "aggs": {
                    "ort": {
                      "geohash_grid": {
                        "buckets_path": "years",
                        "field": "gisOrt",
                        "precision": 4
                      }
                    }
                  }
                }
              }
          }
      });
    }


})();
