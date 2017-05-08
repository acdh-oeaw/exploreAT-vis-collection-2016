var express = require('express');
var passport = require('passport');
path = require('path');
var jwt = require('jsonwebtoken');
var _ = require('underscore');
var router = express.Router();

var app = express();

var jwtConfig = require('config').get('jwt_config');

/* GET home page. */

console.log('Node env ' + app.settings.env);

router.get('/interface.jpg', function(req, res, next) {
    res.sendFile(path.resolve(path.join(__dirname, 'public/exploreat-v3/img/home') + '/interface.jpg'));
});


router.get('/login', function(req, res, next) {
    res.render('login.ejs', { message: req.flash('loginMessage') });
});

router.get('/signup', isLoggedIn, function(req, res) {
    res.render('signup.ejs', { message: req.flash('loginMessage') });
});

router.get('/profile', isLoggedIn, function(req, res) {
    res.render('profile.ejs', { user: req.user });
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

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
            console.log(req.session.redirectTo);
            res.redirect(req.session.redirectTo || '/');

        });
    })(req, res, next);
});


function isLoggedIn(req, res, next) {
    // if (req.isAuthenticated() || app.settings.env == 'development')
    if (req.isAuthenticated())
        return next();
    else {
        console.log(req.path.replace('/',''));
        req.session.redirectTo = req.path.replace('/','');
        res.redirect('/auth/login');
    }
}

module.exports = router;

module.exports.isLoggedIn = isLoggedIn;

