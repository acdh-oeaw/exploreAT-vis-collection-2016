const jwt = require('jsonwebtoken');
const User = require('mongoose').model('User');
const PassportLocalStrategy = require('passport-local').Strategy;
const jwtConfig = require('config').get('jwt_config');


/**
 * Return the Passport Local Strategy object.
 */
module.exports = new PassportLocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    session: true,
    passReqToCallback: false
}, (email, password, done) => {
    const userData = {
        email: email.trim(),
        password: password.trim()
    };

    // find a user by email address
    return User.findOne({ email: userData.email }, (err, user) => {
        if (err) { return done(err); }

        if (!user) {
            const error = new Error("The account does not exist or it has not been approved yet");
            error.name = 'IncorrectCredentialsError';

            return done(error);
        }

        // check if a hashed user's password is equal to a value saved in the database
        return user.comparePassword(userData.password, (passwordErr, isMatch) => {
            if (err) { return done(err); }

            if (!isMatch) {
                const error = new Error('Incorrect password');
                error.name = 'IncorrectCredentialsError';

                return done(error);
            }

            // create a token string
            const jwtUser = {};
            jwtUser.username = user.email.replace(/\./g,'_');
            jwtUser.id = user._id.toString();
            const token = jwt.sign(jwtUser, jwtConfig.secretOrKey, {expiresIn: 60*60*24});
            const data = {
                name: user.email
            };

            return done(null, token, data);
        });
    });
});