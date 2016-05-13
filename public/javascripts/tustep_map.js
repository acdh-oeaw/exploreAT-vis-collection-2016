(function() {


    var esClient = new $.es.Client({
        hosts: "http:\/\/localhost:9200\/"
    });

    var geohashBuckets = [];

    var geohashFeatures;


    var map = L.map('map').setView([47.333333, 13.333333], 7);
    var mapLink =
        '<a href="http://openstreetmap.org">OpenStreetMap</a>';
    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://exploreat.usal.es">ExploreAT!</a>',
        subdomains: 'abcd',
        maxZoom: 14,
        minZoom: 7,
        detectRetina: true
    }).addTo(map);

    L.control.scale().addTo(map);


    /* Initialize the SVG layer */
    map._initPathRoot();

    /* We simply pick up the SVG from the map object */
    var svg = d3.select("#map").select("svg"),
        g = svg.append("g");

    //map.setMaxBounds(map.getBounds());


    d3.json("data/austria.json", function (json) {
        function style(feature) {
            return {
                fillColor: "#E3E3E3",
                weight: 1,
                opacity: 1,
                color: 'black',
                fillOpacity: 0.5
            };
        }

        L.geoJson(json, {
            // onEachFeature: onEachFeature,
            style: style
        }).addTo(map);

        // function onEachFeature(feature, layer){
        //     layer.on({
        //         click : onCountryClick,
        //         mouseover : onCountryHighLight,
        //         mouseout : onCountryMouseOut
        //     });
        // }
    });

    // getDataForZoomLevel(map.getZoom())
    //     .then(function (resp) {
    //
    //     });

    map.on("viewreset", update);
    map.on("zoomstart", function () {
        g.style("opacity", .0)

    });
    map.on("zoomend", function () {

    });
    update();


    function generateFeatures(resp) {
        geohashBuckets = resp.aggregations.buckets.buckets;

        return _.map(geohashBuckets, function (hash_bucket) {
            var coordsObj = Geohash.decode(hash_bucket.key);
            var coords = [coordsObj.lat, coordsObj.lon];

            return {
                "type": "Feature",
                "properties": {
                    "key": hash_bucket.key,
                    "doc_count": hash_bucket.doc_count
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": coords
                }
            };
        });
    }



    function update() {
        getDataForZoomLevel(map.getZoom())
            .then(function(resp) {
                var features = generateFeatures(resp);
                var d3_features = g.selectAll("circle").data(features);

                var minDocCount = _.min(features, function(el) {
                    return el.properties.doc_count;
                }).properties.doc_count;
                var maxDocCount = _.max(features, function(el) {
                    return el.properties.doc_count;
                }).properties.doc_count;

                var sizeInPixels = map.getSize(map.getZoom());

                var radiusScale = d3.scale.linear()
                    .domain([minDocCount, maxDocCount])
                    .range([sizeInPixels.x * 0.01, sizeInPixels.x * 0.03]);


                d3_features.attr("transform",
                    function(d) {
                        return "translate("+
                            map.latLngToLayerPoint(d.geometry.coordinates).x +","+
                            map.latLngToLayerPoint(d.geometry.coordinates).y +")";
                    })
                    .attr("r", function(d){return radiusScale(d.properties.doc_count);});

                d3_features
                    .enter()
                    .append("circle")
                    .attr("transform",
                        function(d) {
                            return "translate("+
                                map.latLngToLayerPoint(d.geometry.coordinates).x +","+
                                map.latLngToLayerPoint(d.geometry.coordinates).y +")";
                        }
                    ).style("stroke", "black")
                    .style("opacity", .6)
                    .style("fill", "red")
                    .attr("r", function(d){return radiusScale(d.properties.doc_count);});

                g.style("opacity", 1);

                d3_features.exit().remove();
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
                            "precision": zoomLevel - 4
                        }
                    }
                }
            }
        });
    }


})();
