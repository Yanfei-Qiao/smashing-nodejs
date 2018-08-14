var express = require('express'),
    search = require('./search');

var app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('view options', { layout: false });

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/search', function (req, res, next) {
    search(req.query.q, function (err, news) {
        if (err) return next(err);
        res.render('search', { results: news, search: req.query.q});
    })
});

app.use(function (err, req, res, next) {
    // res.status(500).send('<h1>服务器出错</h1>');
    res.redirect('/');
});

app.listen(3003);