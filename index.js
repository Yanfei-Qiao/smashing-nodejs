var books = [
    'Node.js微服务',
    '了不起的盖茨比'
];

function serveBooks () {
    var html = '<b>' + books.join('</b><br><b>') + '</b>';
    // books = [];
    return html;
}

var http = require('http');
var serv = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(serveBooks());
});
serv.listen(3000);

// process.on('uncaughtException', function (err) {
//     console.log(err);
//     process.exit(1);
// });

// function c () {
//     b();
// }
// function b () {
//     a();
// }
// function a () {
//     setTimeout(function () {
//         throw new Error('Just a error test');
//     }, 10);
// }
// c();

// var mybuffer = new Buffer('==ii1j2i3h1i23h', 'base64');
// console.log(mybuffer);
// require('fs').writeFile('logo.gif', mybuffer);

// var EventEmitter = require('events').EventEmitter,
//     a = new EventEmitter;
// a.on('event', function () {
//     console.log('event called');
// });
// a.emit('event');

// 错误案例，process.EventEmitter为undefined
// var EventEmitter = process.EventEmitter,
//     MyClass = function () {};
// MyClass.prototype.__proto__ = EventEmitter.prototype;
// var a = new MyClass;
// a.on('event', function () {
//     console.log('event called');
// });
// a.emit('event');