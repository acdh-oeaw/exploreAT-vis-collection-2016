const User = require('mongoose').model('User');
const PassportLocalStrategy = require('passport-local').Strategy;

module.exports = (nev) => {
    let module = {};

    module.strategy = new PassportLocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        session: true,
        passReqToCallback: true
    }, (req, email, password, done) => {
        const userData = {
            email: email.trim(),
            password: password.trim(),
            about: req.body.about
        };

        const newUser = new User(userData);
        nev.createTempUser(newUser, (err, existingPersistentUser, newTempUser) => {
            if (err) {
                console.error(err);
                return done(err);
            }

            if (existingPersistentUser) {
                const err = {
                    name : "ExistingPersistentUserError",
                    message : "This account is already registered."
                };
                console.warn(err);
                return done(err);
            }

            if (newTempUser) {
                const URL = newTempUser[nev.options.URLFieldName];
                const extraSubs = {
                    "EMAIL" : newTempUser.email,
                    "ABOUT" : newTempUser.about
                };
                nev.sendVerificationEmail("abenito@usal.es", URL, extraSubs, (err, info) => {
                    if (err)
                        console.log(err);
                    console.log('Email successfully sent!');
                });
                return done(null);
            } else {
                const err = {
                    name : "ExistingTempUserError",
                    message : "This account is already registered but hasn't been approved yet."
                };
                console.error(err);
                return done(err);
            }
        });
    });

    return module;
};


/**
 * Return the Passport Local Strategy object.
 */