const express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    bodyparser = require('body-parser'),
    config = require('config'),


    api = require('./server/routes/api'),
    passport = require('passport'),
    mongoose = require('mongoose'),


    session = require('express-session');


require('./server/models').connect(config.get('mongodb').url);

const app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

if (app.get('env') === 'development') {
    app.use(logger('dev'));
} else app.use(logger('combined'));

app.use(bodyparser.urlencoded({ extended: false }));

app.use(passport.initialize());


// app.use(express.static(path.join(__dirname, 'public')));

const localSignupStrategy = require('./server/passport/local-signup');
const localLoginStrategy = require('./server/passport/local-login');
const jwtStrategy = require('./server/passport/jwt');

passport.use('local-signup', localSignupStrategy);
passport.use('local-login', localLoginStrategy);
passport.use('jwt', jwtStrategy);

const authCheckMiddleware = require('./server/middleware/auth-check');


app.use('/', express.static(path.join(__dirname, 'public', 'static')));
app.use(express.static('./client/dist/'));
const authRoutes = require('./server/routes/auth');
app.use('/auth', authRoutes);
app.use('/api', [authCheckMiddleware, api]);

// app.use('/exploreat-v3/api', api);

app.use('/', [authCheckMiddleware, express.static(path.join(__dirname, 'public'))]);

// require('./config/passport')(passport, jwtconfig);


app.use(function(req, res, next) {
  res.header("access-control-allow-origin", "*");
  res.header("access-control-allow-headers", "origin, x-requested-with, content-type, accept");
  next();
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.status(404).send("Sorry can't find that!");
});

// error handlers

// // development error handler
// // will print stacktrace
// if (app.get('env') === 'development') {
//   app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error.ejs', {
//       message: err.message,
//       error: err
//     });
//   });
// }
//
// // production error handler
// // no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//   res.status(err.status || 500);
//   res.render('error.ejs', {
//     message: err.message,
//     error: {}
//   });
// });


module.exports = app;
