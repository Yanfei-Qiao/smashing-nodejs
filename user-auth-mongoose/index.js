const express = require('express');
const mongoose = require('mongoose');
const assert = require('assert');

var app = express();
const bodyParser = require('body-parser');
const session = require('express-session');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(require('cookie-parser')());
app.use(session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: true
}));
app.use(function (req, res, next) {
    if(req.session.loggedIn) {
        res.locals.authenticated = true;
        User.findById(req.session.loggedIn, function (err, doc) {
            if (err) return next(err);
            res.locals.me = doc;
            next();
        });
    } else {
        res.locals.authenticated = false;
        next();
    }
});

app.set('view engine', 'pug');

app.get('/', function (req, res) {
    res.render('index');
});
app.get('/login', function (req, res) {
    res.render('login');
});
app.get('/login/:signupEmail', function (req, res) {
    res.render('login', { signupEmail: req.params.signupEmail});
});
app.get('/signup', function (req, res) {
    res.render('signup');
});
app.get('/logout', function (req, res) {
    req.session.loggedIn = null;
    res.redirect('/');
});
app.post('/signup', function (req, res, next) {
    var user = new User(req.body.user).save(function (err) {
        if (err) return next(err);
        res.redirect('/login/' + user.email);
    });
});
app.post('/login', function (req, res, next) {
    User.findOne({'email': req.body.user.email, 'password': req.body.user.password}, function (err, doc) {
        if(err) return next(err);
        if(!doc) return res.send('<p>User not found. Go back and try again</p>');
        req.session.loggedIn = doc._id.toString();
        res.redirect('/');
    });
});

mongoose.connect('mongodb://127.0.0.1:27017/my-website');
app.listen(3006, function () {
    console.log('\033[96m  + \033[39m app listening on *:3006');
});

var Schema = mongoose.Schema;
var User = mongoose.model('User', new Schema({
    first: String,
    last: String,
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String,
        index: true
    }
}));
