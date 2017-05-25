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
            if (err)
                console.log(err);
            if (existingPersistentUser)
                console.log('user already exists');

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
            } else {
                console.log("Couldn't create new user");
            }
        });
    });

    return module;
};


/**
 * Return the Passport Local Strategy object.
 */