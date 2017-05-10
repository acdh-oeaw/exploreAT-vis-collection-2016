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
app.use(logger('dev'));
app.use(bodyparser.urlencoded({ extended: false }));

app.use(passport.initialize());


// app.use(express.static(path.join(__dirname, 'public')));

const localsignupstrategy = require('./server/passport/local-signup');
const localloginstrategy = require('./server/passport/local-login');
passport.use('local-signup', localsignupstrategy);
passport.use('local-login', localloginstrategy);

const authCheckMiddleware = require('./server/middleware/auth-check');
app.use('/api', authCheckMiddleware);



app.use('/', express.static(path.join(__dirname, 'public', 'static')));
app.use(express.static('./client/dist/'));
const authRoutes = require('./server/routes/auth');
app.use('/auth', authRoutes);

// app.use('/exploreat-v3/api', api);

// app.use('/', [authroutes.isloggedin, express.static(path.join(__dirname, 'public'))]);

// require('./config/passport')(passport, jwtconfig);


app.use(function(req, res, next) {
  res.header("access-control-allow-origin", "*");
  res.header("access-control-allow-headers", "origin, x-requested-with, content-type, accept");
  next();
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new error('not found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error.ejs', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error.ejs', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
