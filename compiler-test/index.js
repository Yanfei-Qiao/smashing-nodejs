const grunt = require('grunt');
const { ast } = require('cmd-util');

var data = grunt.file.read('./test.js');
// var meta = ast.parse(data);
var meta = ast.getAst(data);

console.log(meta);