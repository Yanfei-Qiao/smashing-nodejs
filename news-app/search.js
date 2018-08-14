var request = require('superagent');

module.exports = function search (query, fn) {
    request.get('https://www.apiopen.top/novelSearchApi')
        .query({name: query})
        .end(function (err, res) {
            // console.log(res.body);
            if (err) fn(new Error('搜索失败'));
            if (res.body && res.body.data) {
                return fn(null, res.body.data);
            }
            fn(new Error('搜索失败'));
        });
;}