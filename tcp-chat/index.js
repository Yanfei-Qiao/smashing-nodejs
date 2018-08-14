var net = require('net');
var count = 0,
    users = {};

var server = net.createServer(function (conn) {
    // console.log('\033[90m    new connection;\033[39m');
    conn.write(
        '\r\n > welcome to \033[92mnode-chat\033[39m!'
        + '\r\n > ' + count + ' other people are connected at this time.'
        + '\r\n > please write your name and press enter: '
    );
    
    count++;
    conn.setEncoding('utf8');

    var nickname;

    conn.on('data', function (data) {
        // 为何每次只读取一个字符
        // console.log(data);
        data = data.replace('\r\n', '');
        console.log(data);
    });
    conn.on('close', function () {
        count--;
    });
});

server.listen(3001, function () {
    console.log('\033[96m    server listening on *:3001\033[39m');
});