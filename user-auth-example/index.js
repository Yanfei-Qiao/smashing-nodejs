const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const assert = require('assert');
const bcrypt = require('bcrypt');
const saltRounds = 10;

var app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

const url = 'mongodb://127.0.0.1:27017';
MongoClient.connect(url, {useNewUrlParser: true}, function(err, client) {
    assert.equal(null, err);
    console.log('\033[96m  + \033[39m connected to mongodb');

    var db = client.db("my-website");
    app.users = db.collection('users');
    app.projects = db.collection('projects');

    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    app.use(require('cookie-parser')());
    app.use(session({
        secret: 'my secret',
        store: new MongoStore({
            url: 'mongodb://localhost:27017/my-website',
            db: db
        }),
        // cookie: {
        //     maxAge: 3600000
        // },
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
    // app.post('/signup', function (req, res, next) {
    //     bcrypt.hash(req.body.user.password, saltRounds, function(err, hash) {
    //         // Store hash in your password DB.
    //         assert.equal(null, err);
    //         req.body.user.password = hash;
    //         app.users.insertOne(req.body.user, function (err, doc) {
    //             if (err) return next(err);
    //             // console.log(doc.ops[0]);
    //             res.redirect('/login/' + doc.ops[0].email);
    //         });
    //     });
    // });

    app.post('/login', function (req, res, next) {
        app.users.find({'email': req.body.user.email}).toArray(function(err, doc) {
            if(err) return next(err);
            // console.log(doc);
            if(!doc.length) return res.send('<p>User not found. Go back and try again</p>');
            if(!req.body.user.password) {
                res.status(400).json({ // Bad Request
                    message: 'Password cannot be empty!'
                });
                return;
            }
            if(!doc[0].password) {
                res.status(401).end(); // Not Authorized
                return;
            }
            bcrypt.compare(req.body.user.password, doc[0].password, function(err, result) {
                assert.equal(null, err);
                req.session.loggedIn = doc[0]._id.toString();
                res.status(200).end();
                // res.redirect('/');
            });
        });
    });
    app.post('/logout', function (req, res) {
        req.session.loggedIn = null;
        res.status(204).end();
    });

    app.get('/project/list', function (req, res, next) {
        app.projects.find({}).project({_id: 0}).toArray(function(err, docs) {
            if (err) return next(err);
            // console.log(docs);
            res.json(docs);
            // res.redirect('/login/' + doc.ops[0].email);
        });
    })
    app.post('/project/list', function (req, res, next) {
        res.json([{name: 'Flying to Mars'}, {name: 'Diving'}]);
    })
    app.put('/project/list', function (req, res, next) {
        console.log(req.body);
        res.status(201).end();
        return;
        app.projects.insertOne(req.body, function (err, doc) {
            if (err) return next(err);
            console.log(doc.ops[0]);
            res.status(201).json(req.body);
            // res.redirect('/login/' + doc.ops[0].email);
        });
    })
    app.delete('/project/list', function (req, res, next) {
        res.json(req.body);
    })

    app.listen(3006, function () {
        console.log('\033[96m  + \033[39m app listening on *:3006');
    });
});
