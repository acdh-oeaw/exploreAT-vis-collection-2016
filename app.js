var express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    config = require('config'),
    jwtConfig = config.get('jwt_config'),
    index = require('./routes/index'),
    users = require('./routes/users'),
    api = require('./routes/api'),
    passport = require('passport'),
    mongoose = require('mongoose'),
    flash = require('connect-flash'),
    session = require('express-session');

var app = express();

app.jwtConfig = jwtConfig;

var mongoURL = config.get('mongodb').url;
mongoose.connect(mongoURL);
console.log(mongoURL);


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/public')));
app.use('/bower_components',express.static(path.join(__dirname, '/bower_components')));
//app.use('/bower_components',  express.static(__dirname + '/bower_components'));

app.use(session({ secret: 'shhsecret',
                    resave: false,
                    saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use('/', index);
app.use('/users', users);
app.use('/api', api);

require('./config/passport')(passport, jwtConfig);


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
