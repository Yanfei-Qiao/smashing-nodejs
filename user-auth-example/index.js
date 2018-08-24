const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
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
        // console.log(req.session.loggedIn);
        app.users.find({'_id': ObjectId(req.session.loggedIn)}).toArray(function(err, doc) {
            if(err) return next(err);
            res.locals.me = doc[0];
            // console.log(doc);
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
    app.users.insertOne(req.body.user, function (err, doc) {
        if (err) return next(err);
        // console.log(doc.ops[0]);
        res.redirect('/login/' + doc.ops[0].email);
    });
});
app.post('/login', function (req, res, next) {
    app.users.find({'email': req.body.user.email, 'password': req.body.user.password}).toArray(function(err, doc) {
        if(err) return next(err);
        // console.log(doc);
        if(!doc.length) return res.send('<p>User not found. Go back and try again</p>');
        req.session.loggedIn = doc[0]._id.toString();
        res.redirect('/');
    });
});

const url = 'mongodb://127.0.0.1:27017';
MongoClient.connect(url, {useNewUrlParser: true}, function(err, client) {
    if (err) throw err;
    console.log('\033[96m  + \033[39m connected to mongodb');
    var db = client.db("my-website");
    app.users = db.collection('users');
    app.users.createIndex({email: "text"}, null, function (err, result) {
        assert.equal(null, err);
        // console.log(result);
        app.users.createIndex({password: 1}, function (err, result) {
            assert.equal(null, err);
            // console.log(result);
            app.listen(3006, function () {
                console.log('\033[96m  + \033[39m app listening on *:3006');
            });
        });
    });
});
