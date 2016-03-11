var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/', function(req,res) {
    res.render('index');
});

// router.get('/ex_persons', function(req,res) {
//     res.render('ex_persons');
// });

router.get('/ex_words', function(req,res) {
    res.render('ex_words');
});

router.get('/ex_words_sources', function(req,res) {
    res.render('ex_words_sources');
});

// router.get('/ex_word_bubbles', function(req,res) {
//     res.render('ex_word_bubbles');
// });

// router.get('/ex_word_circles', function(req,res) {
//     res.render('ex_word_circles');
// });

router.get('/ex_word_treemap', function(req,res) {
    res.render('ex_word_treemap');
});

router.get('/ex_fragebogen_data', function(req,res) {
    res.render('ex_fragebogen_data');
});

// router.get('/ex_colors', function(req,res) {
//     res.render('ex_colors');
// });

module.exports = router;
