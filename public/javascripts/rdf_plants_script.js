var mainExports = {};

(function() {

    // ELASTIC

    var esClient = new $.es.Client({
        hosts: elasticEndpoint
    });

    var indexName = 'rdf-plants';

})();

console.log("Plants aint a thing!")
