var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/', function(req,res) {
    res.render('index');
});

router.get('/ex_persons', function(req,res) {
    res.render('ex_persons');
});

router.get('/ex_words', function(req,res) {
    res.render('ex_words');
});

router.get('/ex_colors', function(req,res) {
    res.render('ex_colors');
});

module.exports = router;
