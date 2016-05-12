(function() {


    var esClient = new $.es.Client({
        hosts: "http:\/\/localhost:9200\/"
    });

    var geohashBuckets = [];

    var geohashFeatures;
    var d3_features;


    var map = L.map('map').setView([47.333333, 13.333333], 7);
    var mapLink =
        '<a href="http://openstreetmap.org">OpenStreetMap</a>';
    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 14,
        minZoom: 7,
        detectRetina: true
    }).addTo(map);

    /* Initialize the SVG layer */
    map._initPathRoot();

    /* We simply pick up the SVG from the map object */
    var svg = d3.select("#map").select("svg"),
        g = svg.append("g");

    map.setMaxBounds(map.getBounds());


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

    esClient.search({
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
                        "precision": 3
                    }
                }
            }
        }
    }).then(function (resp) {
        console.log(resp.aggregations.buckets.length);
        geohashBuckets = resp.aggregations.buckets.buckets;

        geohashFeatures = _.map(geohashBuckets, function(hash_bucket) {
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


        // create path elements for each of the features
        d3_features = g.selectAll("circle")
            .data(geohashFeatures)
            .enter().append("circle");

        map.on("viewreset", update);
        update();
    });


    function update() {

        console.log(map.getZoom());

        d3_features.attr("transform",
            function(d) {
                return "translate("+
                    map.latLngToLayerPoint(d.geometry.coordinates).x +","+
                    map.latLngToLayerPoint(d.geometry.coordinates).y +")";
            }
        ).style("stroke", "black")
            .style("opacity", .6)
            .style("fill", "red")
            .attr("r", 20);

    }

})();
