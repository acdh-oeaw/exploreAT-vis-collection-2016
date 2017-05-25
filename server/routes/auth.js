const express = require('express');
const passport = require('passport');
const validator = require('validator');
const path = require('path');
const jwt = require('jsonwebtoken');
const router = express.Router();

const app = express();

const jwtConfig = require('config').get('jwt_config');

/**
 * Validate the sign up form
 *
 * @param {object} payload - the HTTP body message
 * @returns {object} The result of validation. Object contains a boolean validation result,
 *                   errors tips, and a global message for the whole form.
 */

module.exports = (nev) => {
    function validateSignupForm(payload) {
        const errors = {};
        let isFormValid = true;
        let message = '';

        if (!payload || typeof payload.email !== 'string' || !validator.isEmail(payload.email)) {
            isFormValid = false;
            errors.email = 'Please provide a correct email address.';
        }

        if (!payload || typeof payload.password !== 'string' || payload.password.trim().length < 8) {
            isFormValid = false;
            errors.password = 'Password must have at least 8 characters.';
        }

        if (!payload || typeof payload.about !== 'string' || payload.about.trim().length > 120) {
            isFormValid = false;
            errors.password = 'About field cannot be longer than 120 characters';
        }

        if (!isFormValid) {
            message = 'Check the form for errors.';
        }

        return {
            success: isFormValid,
            message,
            errors
        };
    }

    /**
     * Validate the login form
     *
     * @param {object} payload - the HTTP body message
     * @returns {object} The result of validation. Object contains a boolean validation result,
     *                   errors tips, and a global message for the whole form.
     */
    function validateLoginForm(payload) {
        const errors = {};
        let isFormValid = true;
        let message = '';

        if (!payload || typeof payload.email !== 'string' || payload.email.trim().length === 0) {
            isFormValid = false;
            errors.email = 'Please provide your email address.';
        }

        if (!payload || typeof payload.password !== 'string' || payload.password.trim().length === 0) {
            isFormValid = false;
            errors.password = 'Please provide your password.';
        }

        if (!isFormValid) {
            message = 'Check the form for errors.';
        }

        return {
            success: isFormValid,
            message,
            errors
        };
    }

    let module = {};



// router.get('/interface.jpg', function(req, res, next) {
//     res.sendFile(path.resolve(path.join(__dirname, 'public/exploreat-v3/img/home') + '/interface.jpg'));
// });


// router.get('/login', function(req, res, next) {
//     res.render('login.ejs', { message: req.flash('loginMessage') });
// });
//
// router.get('/signup', isLoggedIn, function(req, res) {
//     res.render('signup.ejs', { message: req.flash('loginMessage') });
// });

// router.get('/profile', isLoggedIn, function(req, res) {
//     res.render('profile.ejs', { user: req.user });
// });

// router.get('/logout', function(req, res) {
//     req.logout();
//     res.redirect('/');
// });

// router.get('/tokenTest', passport.authenticate('jwt', { session: false }),
//     function(req, res) {
//         res.send(req.user);
//     }
// );

// router.post('/signup', passport.authenticate('local-signup', {
//     successRedirect: './',
//     failureRedirect: 'signup',
//     failureFlash: true
// }));

    router.post('/signup', (req, res, next) => {
        const validationResult = validateSignupForm(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                message: validationResult.message,
                errors: validationResult.errors
            });
        }

        return passport.authenticate('local-signup', (err) => {
            if (err) {
                if (err.name === 'MongoError' && err.code === 11000) {
                    // the 11000 Mongo code is for a duplication email error
                    // the 409 HTTP status code is for conflict error
                    return res.status(409).json({
                        success: false,
                        message: 'Check the form for errors.',
                        errors: {
                            email: 'This email is already taken.'
                        }
                    });
                }

                if (err.name === 'ExistingPersistenUserError') {
                    return res.status(400).json({
                        success: false,
                        message: err.message,
                        errors: {
                            email: 'This email is already taken.'
                        }
                    })
                }

                if (err.name === 'ExistingTempUserError') {
                    return res.status(400).json({
                        success: false,
                        message: err.message,
                        errors: {
                            email: 'This email is already taken.'
                        }
                    })
                }

                return res.status(400).json({
                    success: false,
                    message: 'Could not process the form.'
                });
            } else {
                return res.status(200).json({
                    success: true,
                    message: 'You have successfully signed up. ' +
                    'We will review your account details and will get back to you shortly'
                });
            }


        })(req, res, next);
    });



// router.post('/login', function(req, res, next) {
//     passport.authenticate('local-login', function(err, user, info) {
//         if (err) { return next(err) }
//         if (!user) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }
//
//         req.logIn(user, function (err) {
//             if (err) throw err;
//             const jwtUser = {};
//             jwtUser.username = user.local.username;
//             jwtUser.id = user._id.toString();
//             const token = jwt.sign(jwtUser, jwtConfig.secretOrKey, {
//                 expiresIn: 60*60*24
//             });
//             console.log(token);
//             res.cookie('token', token);
//             console.log(req.session.redirectTo);
//             res.redirect(req.session.redirectTo || '/');
//
//         });
//     })(req, res, next);
// });

    router.post('/login', (req, res, next) => {
        const validationResult = validateLoginForm(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                message: validationResult.message,
                errors: validationResult.errors
            });
        }


        return passport.authenticate('local-login', (err, token, userData) => {
            if (err) {
                if (err.name === 'IncorrectCredentialsError') {
                    return res.status(400).json({
                        success: false,
                        message: err.message
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: 'Could not process the form.'
                });
            }


            return res.json({
                success: true,
                message: 'You have successfully logged in!',
                token,
                user: userData
            });
        })(req, res, next);
    });


    router.get('/approve/:url', (req, res, next) => {
        const url = req.params.url;
        nev.confirmTempUser(url, (err, user) => {
            if (err)
                console.log('Error confirming user');
            if (user) {
                nev.sendConfirmationEmail(user.email, (err, info) => {
                    if (err)
                        console.log('Error sending confirmation email');
                    else
                        console.log('Confirmation email sent!');
                });
            }
        });
    });

    module.router = router;

    return module;
};


