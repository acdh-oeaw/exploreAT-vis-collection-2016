var express = require('express');
var passport = require('passport');
var router = express.Router();

/* GET home page. */

router.get('/', isLoggedIn, function(req,res) {
    res.render('index', { user : req.user });
});

router.get('/login', function(req, res, next) {
    res.render('login.ejs', { message: req.flash('loginMessage') });
});

router.get('/signup', function(req, res) {
    res.render('signup.ejs', { message: req.flash('loginMessage') });
});

router.get('/profile', isLoggedIn, function(req, res) {
    res.render('profile.ejs', { user: req.user });
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

// router.get('/ex_persons', function(req,res) {
//     res.render('ex_persons');
// });

router.get('/ex_words', isLoggedIn, function(req,res) {
    res.render('ex_words');
});

router.get('/ex_words_sources', isLoggedIn, function(req,res) {
    res.render('ex_words_sources');
});

// router.get('/ex_word_bubbles', function(req,res) {
//     res.render('ex_word_bubbles');
// });

// router.get('/ex_word_circles', function(req,res) {
//     res.render('ex_word_circles');
// });

router.get('/ex_word_treemap', isLoggedIn, function(req,res) {
    res.render('ex_word_treemap');
});

router.get('/ex_fragebogen_data_div', isLoggedIn, function(req,res) {
    res.render('ex_fragebogen_data_div');
});

router.get('/ex_fragebogen_data_tree', isLoggedIn, function(req,res) {
    res.render('ex_fragebogen_data_tree');
});

router.get('/ex_fragebogen_data_circles', isLoggedIn, function(req,res) {
    res.render('ex_fragebogen_data_circles');
});

router.get('/ex_tustep_matrix', isLoggedIn, function(req,res) {
    res.render('ex_tustep_matrix');
});

router.get('/ex_tustep_scatter', isLoggedIn, function(req,res) {
    res.render('ex_tustep_scatter');
});

router.get('/map', isLoggedIn, function(req,res) {
    res.render('map');
});

router.get('/ex_tustep_map', isLoggedIn, function(req,res) {
    res.render('ex_tustep_map');
});

router.get('/ex_rdf_plants', isLoggedIn, function(req,res) {
    res.render('ex_rdf_plants');
});

router.get('/ex_bedeutung', isLoggedIn, function(req,res) {
    res.render('ex_bedeutung');
});

// router.get('/ex_colors', function(req,res) {
//     res.render('ex_colors');
// });

router.post('/signup', passport.authenticate('local-signup', {
    successRedirect: './',
    failureRedirect: 'signup',
    failureFlash: true
}));

router.post('/login', passport.authenticate('local-login', {
    successRedirect: './',
    failureRedirect: 'login',
    failureFlash: true
}));


module.exports = router;

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();
    res.redirect('login');
}
