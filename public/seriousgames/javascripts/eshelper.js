function getToken() {
    return localStorage.getItem('token');
}

function getESHost() {
    if(window.location.href.indexOf('https') == 0) {
        return 'https://exploreat.usal.es/elasticsearch';
    } else {
        return 'http:\/\/localhost:9200'
    }
}

