const passportJWT = require("passport-jwt"),
    passport = require('passport'),
    ExtractJwt = passportJWT.ExtractJwt,
    JwtStrategy = passportJWT.Strategy,
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    ObjectId = mongoose.Types.ObjectId;
    jwtConfig = require('config').get('jwt_config');

const jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeader();
jwtOptions.secretOrKey = jwtConfig.secretOrKey;


module.exports = new JwtStrategy(jwtOptions, (jwt_payload, done) => {
    console.log('payload received', jwt_payload);
    User.findOne({_id: new ObjectId(jwt_payload.sub)}, function (err, user) {
        if (err) {
            return done(err, false);
        }
        if (user) {
            done(null, user);
        } else {
            done(null, false)
        }
    });
});