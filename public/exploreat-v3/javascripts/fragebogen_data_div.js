var root = {
    "name": "ExploreAT!",
    "type": "root",
    "children": []
};
var response;
var processing = false;


var ESToken = getToken();

var esClient = new $.es.Client({
    host: getESHost()
});

// AUTOMATIC INITIALIZATION
// processing = true;
// createWords("*");
///////////////////////////

$('#generateButton').on("click", function(){
    if(!processing){createWords();}
});

$('#filterFragebogen').keyup(function(){
    if(!processing){createWords();}
});

$('#filterFrage').keyup(function(){
    if(!processing){createWords();}
});

$('#filterLemma').keyup(function(){
    if(!processing){createWords();}
});

function resetViz(){

    d3.select('#spinner').classed('hidden',false);

    processing = true;

    $('#content').html(function(){
        var html = '';
        html += '<div id="spinner">';
        html += '<i class="fa fa-circle-o-notch fa-spin fa-2x"></i>';
        html += '</div>';
        return html;
    });

    root = {
        "name": "ExploreAT!",
        "type": "root",
        "children": []
    };
}

function createWords() {

    resetViz();

    var inputFragebogen = $('#filterFragebogen').val().toLowerCase();
    var inputFrage = $('#filterFrage').val().toLowerCase();
    var inputLemma = $('#filterLemma').val().toLowerCase();

    if(inputFragebogen == "") {inputFragebogen = "*";}
    else{inputFragebogen = "*"+inputFragebogen+"*"}
    if(inputFrage == "") {inputFrage = "*";}
    else{inputFrage = "*"+inputFrage+"*"}
    if(inputLemma == ""){inputLemma = "*";}
    else{inputLemma = "*"+inputLemma+"*"}

    esClient.search({
        index: 'dboe-beleg-frage-fragebogen-lemma',
        headers: {
            'Authorization' : "Bearer " + ESToken
        },
        size: 1000,
        body: {
            query : {
                bool: {
                    must: [
                        { wildcard: { "frages.lemmas.dbo.raw" : inputLemma }},
                        { wildcard: { "frages.originalFrage.raw" : inputFrage }},
                        { wildcard: { "fragebogen_titel.raw" : inputFragebogen }}
                    ]
                }
            }
        },
        sort: "fragebogen_nummer:asc"
    }).then(function (resp) {

        for(var i=0; i<resp.hits.hits.length && i<800; i++){

            $('#content').append(function(){
                var html = "";
                html += '<div class="frageholder">';
                html += '<div class="fragebogen top">'
                html += 'FRAGEBOGEN: ';
                html += resp.hits.hits[i]._source.fragebogen_nummer+" - "+resp.hits.hits[i]._source.fragebogen_titel;
                html += '</div>';
                html += '<div class="fragebogen bottom">'
                for(var j=0; j<resp.hits.hits[i]._source.frages.length && j<2000; j++){
                    if(resp.hits.hits[i]._source.frages[j] != undefined){
                        for(var k=0; k<resp.hits.hits[i]._source.frages[j].lemmas.length && k<2000; k++){
                            // Append the frage only if it contains the lemma
                            if(resp.hits.hits[i]._source.frages[j].lemmas[k].dbo.toLowerCase().indexOf(inputLemma.replace(/\*/g , "")) > -1){
                                html += '<div class="frage">';
                                html += '<div class="box-title">';
                                html += ' - FRAGE: ';
                                html += resp.hits.hits[i]._source.frages[j].originalFrage;
                                html += '</div>';
                                for(var k=0; k<resp.hits.hits[i]._source.frages[j].lemmas.length && k<2000; k++){
                                    if(resp.hits.hits[i]._source.frages[j].lemmas[k] != undefined){
                                        if(resp.hits.hits[i]._source.frages[j].lemmas[k].dbo.toLowerCase().indexOf(inputLemma.replace(/\*/g , "")) > -1){
                                            html += '<div class="lemma">';
                                            html += ' - - LEMMA: ';
                                            if(resp.hits.hits[i]._source.frages[j].lemmas[k].dbo.toLowerCase().indexOf(inputLemma.replace(/\*/g , "")) > -1){
                                                html += '<span class="yellow">';
                                                html += resp.hits.hits[i]._source.frages[j].lemmas[k].dbo;
                                                html += '</span>';
                                            }
                                            else{
                                                html += resp.hits.hits[i]._source.frages[j].lemmas[k].dbo;
                                            }
                                            html += '</div>';
                                        }
                                    }
                                }
                                html += '</div>';
                                break;
                            }
                        }
                    }
                }
                html += '</div>';
                html += '</div>';
                return html;
            })
        }

        d3.select('#spinner').classed('hidden',true);
        processing = false;
        return;
    });
}
