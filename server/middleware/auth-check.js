// const jwt = require('jsonwebtoken');
// const User = require('mongoose').model('User');
// const jwtConfig = require('config').get('jwt_config');

const passport = require('passport');


/**
 *  The Auth Checker middleware function.
 */

module.exports = (req, res, next) => {
    return passport.authenticate('jwt', {session: false}, (err, user, info) => {
        if (!user) {
            if (err) {
                return res.status(401).json({
                    success: false,
                    message: 'There was a problem authenticating you. If the problem persists please contact the administrator'
                });
            }
            if (info && info.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Your session has expired, please log in again.'
                });
            }
            return next();
        } else return next();
    })(req, res, next);
};


