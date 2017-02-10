var express = require('express');
var passport = require('passport');

var jwt = require('jsonwebtoken');
var _ = require('underscore');
var router = express.Router();

var app = express();

var jwtConfig = require('config').get('jwt_config');

/* GET home page. */

console.log('Node env ' + app.settings.env);

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

// router.get('/token', isLoggedIn, function (req, res) {
//     res.send(req.session.token)
// });

// router.get('/ex_colors', function(req,res) {
//     res.render('ex_colors');
// });




router.get('/tokenTest', passport.authenticate('jwt', { session: false }),
    function(req, res) {
        res.send(req.user);
    }
);



router.post('/signup', passport.authenticate('local-signup', {
    successRedirect: './',
    failureRedirect: 'signup',
    failureFlash: true
}));


router.post('/login', function(req, res, next) {
    passport.authenticate('local-login', function(err, user, info) {
        if (err) { return next(err) }
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        req.logIn(user, function (err) {
           if (err) throw err;
           var jwtUser = {};
           jwtUser.username = user.local.username;
           jwtUser.id = user._id.toString();
           var token = jwt.sign(jwtUser, jwtConfig.secretOrKey, {
               expiresIn: 60*60*24
           });
           console.log(token);
           res.cookie('token', token);
           res.redirect(req.session.redirectTo || './');

        });
    })(req, res, next);
});

module.exports = router;

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated() || app.settings.env == 'development')
        return next();
    else {
        req.session.redirectTo = req.path.replace('/','');
        res.redirect('login');
    }
}
