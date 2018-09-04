'use strict';
const exec = require('child_process').exec;
var ncp = require('ncp').ncp;
var path = require('path');
const fs = require("fs") ;
var ast = require('cmd-util').ast;
var iduri = require('cmd-util').iduri;
var grunt = require('grunt');
var Promise = require('promise');
var script = require('grunt-cmd-transport/tasks/lib/script').init(grunt);
var path = require('path');
var cmd = require('cmd-util');
var ast = cmd.ast;
var iduri = cmd.iduri;
var uglifyscript = require('grunt-contrib-uglify/tasks/lib/uglify').init(grunt);
var argv = require('optimist').argv;

var force = false;
if(argv.force == 1){
  force = true;
}

var jsConcat = function(fileObj, options) {
  var data = grunt.file.read(fileObj.src);

  var meta = ast.parseFirst(data);
  var records = grunt.option('concat-records');//console.log(meta);
  if(!meta){
    return data;
  }
  if (grunt.util._.contains(records, meta.id)) {
    return '';
  }
  records.push(meta.id);

  if (options.include === 'self') {
    return data;
  }

  var pkgPath = path.resolve('package.json');
  if (grunt.file.exists(pkgPath)) {
    var pkg = grunt.file.readJSON(pkgPath);
    if (pkg.spm && pkg.spm.styleBox === true) {
      options.styleBox = true;
    }
  }

  var rv = meta.dependencies.map(function(dep) {
    if (dep.charAt(0) === '.') {
      var id = iduri.absolute(meta.id, dep);
      if (grunt.util._.contains(records, id)) {
        return '';
      }
      records.push(id); 

      var fpath = path.join(path.dirname(fileObj.src), dep);
      
      if (!/\.js$/.test(fpath)) fpath += '.js';
      if (!grunt.file.exists(fpath)) {
        if (!/\{\w+\}/.test(fpath)) {
          grunt.log.warn('file ' + fpath + ' not found');
        }
        return '';
      }

      var astCache = ast.getAst(grunt.file.read(fpath));//console.log(grunt.file.read(fpath));
      var srcId = ast.parseFirst(astCache).id;
      astCache = ast.modify(astCache,  function(v) {
        if (v.charAt(0) === '.') {
          return iduri.absolute(srcId, v);
        }
        return v;
      });

      return astCache.print_to_string(options.uglify);

    } else if ((/\.css$/.test(dep) && options.css2js) || options.include === 'all') {
      var fileInPaths;

      options.paths.some(function(basedir) {
        var fpath = path.join(basedir, dep);
        if (!/\.(?:css|js)$/.test(dep)) {
          fpath += '.js';
        }

        if (grunt.file.exists(fpath)) {
          fileInPaths = fpath;
          return true;
        }
      });

      if (!fileInPaths) {
        grunt.log.warn('file ' + dep + ' not found');
      } else {
        var data = grunt.file.read(fileInPaths);
        if (/\.css$/.test(dep)) {
          return options.css2js(data, dep, options);
        }
        return data;
      }
    }
    return '';
  }).join(grunt.util.normalizelf(options.separator));

  return [data, rv].join(grunt.util.normalizelf(options.separator));
};

var gruntBySingleFile = {
  runExec:function(cmdStr,cb){
    exec(cmdStr, function(err, stdout, stderr){
      if(err) {
        console.log('get weather api error:'+stderr);
      } else {
        cb(stdout);
      }
    });
  },

  getGitStatus:function(cb){
    this.runExec('git status -s',function(res){
      var Reflogs = res.split('\n');
      cb(Reflogs);
    });
  },

  // 从最外层目录一级一级检查destPath指定的目录是否存在
  // 如不存在则不断创建子目录，直至找到文件时调用回调函数
  checkDirectory: function(destPath, extname, cb){
    var destPaths = destPath.split('\\');
    var i = 0;
    var temppath = "";
    var checkSubDirectory = function () {
      temppath += destPaths[i] + "\\";
      fs.exists(temppath, (exists) => {
        if (exists) {
          // console.log('存在',temppath);
          checkSubDirectory(++i);
        } else {
          if (temppath.indexOf(extname)!=-1) {
            cb();
          } else {
            fs.mkdir(temppath,(res) => {
              checkSubDirectory(++i);
            });
          }
        }
      });
    }
    checkSubDirectory();
  },

  // 将cmd风格的js文件转换为标准的cmd模块
  // id使用jspathname去掉扩展名
  transportFile: function(sourceFile, destPath, jspathname, cb){
    // 参数例子
    // appjs/account/bill/check.js, D:\work\xhh\XHH_YRZIF\public\.build\appjs\account\bill\check.js, /public/dist/appjs/account/bill/check.js
    // moudlejs/arttemplate/template.js, D:\work\xhh\XHH_YRZIF\public\.build\moudlejs\arttemplate\template.js, arttemplate/template.js
    var options = {
      paths: ['moudlejs/'],

      idleading: '',
      alias: {},

      // create a debug file or not
      debug: false,

      // process a template or not
      process: false,

      // for handlebars
      handlebars: {
        id: 'gallery/handlebars/1.0.2/runtime',
        knownHelpers: [],
        knownHelpersOnly: false
      },

      // output beautifier
      uglify: {
        beautify: true,
        comments: true
      },

      // https://github.com/aliceui/aliceui.org/issues/9
      styleBox: false,

      parsers: {}
    };
    fs.readFile(destPath, "utf8", (err, data) => {
      if (err) throw err;
      // console.log(data);
      var fileparsers = [script.jsParser];
      fileparsers.forEach(function(fn) {
        fn({
          src: sourceFile,
          srcData: data,
          name: jspathname,
          dest: destPath
        }, options);
      });
      cb();
    }); 
  },

  getCurrentDirectory:function(){
    let directorys = __dirname.split('\\');
    return directorys[directorys.length-1];
  },

  // 编译指定文件
  compileSingleFile: function (filename, succes) {
    let sourceFile = filename;
    let destPath = path.join(__dirname, '.build', sourceFile);

    fs.exists(sourceFile, (exists) => {
      fs.exists(destPath, (exists) => {
        // 源文件和.build下现在一定存在文件
        this.concatFile(sourceFile, () => {
          // 拼接后，混淆文件放到dist目录下
          this.uglifyFile(sourceFile, succes);
        });
      });
    });
  },

  // 将源文件拷贝到.build文件夹下并进行cmd模块转换，
  // modulejs文件夹下的文件cmd模块标准化后，id名不包含modulejs/
  copyAllMoudlejs: function (filename, succes) {
    var self  = this;
    let sourceFile = filename;
    let extname = path.extname(sourceFile);
    let directory = this.getCurrentDirectory();
    let jspathname = '/' + directory + '/dist/' + sourceFile;

    if(filename.indexOf('moudlejs') != -1){
      jspathname = filename.replace('moudlejs/','');
    }
    
    let destPath = path.join(__dirname, '.build', sourceFile);
    
    fs.exists(sourceFile, (exists) => {
      fs.exists(destPath, (exists) => {
        if (!exists) {
          this.checkDirectory(destPath, extname, () => {
            // 将源文件拷贝到.build文件夹下
            ncp(sourceFile, destPath, (err) => {
              this.transportFile(sourceFile, destPath, jspathname, () => {
                succes();
              });
            });
          });
        } else {
          fs.unlink(destPath,()=>{
            ncp(sourceFile, destPath, (err)=>{
              this.transportFile(sourceFile, destPath, jspathname, () => {
                succes();
              });
            });
          });
        }
      });
    });
  },

  // 将文件的依赖全部拼接到源文件
  concatFile: function (sourceFile, cb) {
    // reset records
    let buildpath = '.build/' + sourceFile;
    // console.log('concatFile buildpath', buildpath);
    
    grunt.option('concat-records', []);
    var options = {
      separator: grunt.util.linefeed,
      uglify: {
        beautify: true,
        comments: true
      },
      paths: ['.build/moudlejs/'],
      processors: {},
      include: 'all',
      noncmd: false,
      banner: '',
      footer: ''
    };

    // src为拼接源文件和相关依赖之后的js文件内容
    var src = jsConcat({src: buildpath, source: sourceFile}, options);
    if (/\.js$/.test(buildpath) && !options.noncmd) {
      var astCache = ast.getAst(src);
      var idGallery = ast.parse(astCache).map(function(o) {
        return o.id;
      });

      src = ast.modify(astCache, {
        dependencies: function(v) {
          if (v.charAt(0) === '.') {
            // 相对路径转绝对路径
            var altId = iduri.absolute(idGallery[0], v);
            if (grunt.util._.contains(idGallery, altId)) {
              return v;
            }
          }
          var ext = path.extname(v);
          // remove useless dependencies
          if (ext && /\.(?:html|txt|tpl|handlebars|css)$/.test(ext)) return null;
          return v;
        }
      }).print_to_string(options.uglify);
    };
    // ensure a new line at the end of file
    src += options.footer;
    if (!/\n$/.test(src)) {
      src += '\n';
    }
    
    // Write the destination file.
    grunt.file.write(buildpath, src);
    cb();
  },

  // 从.build下读文件混淆后写入dist下
  uglifyFile: function(sourceFile, cb){
    let src = '.build/' + sourceFile;
    let buildpath = 'dist/' + sourceFile;
    let extname = path.extname(buildpath);
    // console.log('uglifyFile',buildpath);

    fs.exists(src, (exists) => {
      fs.exists(buildpath, (exists) => {
        if(!exists){
          this.checkDirectory(buildpath, extname, ()=>{
            this.uglifyFileRun(src, buildpath, cb);
          });
        } else {
          fs.unlink(buildpath, () => {
            this.uglifyFileRun(src, buildpath, cb);
          });
        }
      });
    });
  },

  uglifyFileRun: function (src, destPath, cb) {
    var options = {
      banner: '',
      footer: '',
      compress: {
        warnings: false
      },
      mangle: {},
      beautify: false,
      report: false
    };
    let result;
    var banner = grunt.template.process(options.banner);
    var footer = grunt.template.process(options.footer);
    try {
        // console.log("src",src,"destPath",destPath);
        result = uglifyscript.minify([src], destPath, options);
      } catch (e) {
        console.log(e);
        var err = new Error('Uglification failed.');
        if (e.message) {
          err.message += '\n' + e.message + '. \n';
          if (e.line) {
            err.message += 'Line ' + e.line + ' in ' + src + '\n';
          }
        }
        err.origError = e;
        grunt.log.warn('Uglifying source "' + src + '" failed.');
        grunt.fail.warn(err);
      }
      // Concat minified source + footer
      var output = result.min + footer;

      // Only prepend banner if uglify hasn't taken care of it as part of the preamble
      if (!options.sourceMap) {
        output = banner + output;
      }

      // Write the destination file.
      grunt.file.write(destPath, output);
      cb();
  }
}

function runJob(){ 
  let self = this;
  if (force) {
    console.log('强制重建');
    self.deleteFolderRecursive('.build');

    self.runMoudlejs(undefined, function () {
      self.runModify('rebuildall');
    });
    return;
  }

  let needRebuild = this.needRebuild();
  if (needRebuild) {
    console.log('由于有新文件添加，需要重建');
    self.deleteFolderRecursive('.build');

    self.runMoudlejs(undefined, function () {
      self.runModify('rebuild');
    });
  } else {
    self.runModify();
  }
}

runJob.prototype.runModify = function (flag) {
  var self = this;
  if (flag == 'rebuildall') {
    var files = this.getAllFiles('appjs').concat(this.getAllFiles('moudlejs'));
    self.runAppMain(files);
  } else {
    this.getModify(function (appjs) {
      console.log('获取需要编译的全部JS');
      if (flag == 'rebuild') {
        self.runAppMain(appjs);
      } else {
        self.runMoudlejs(appjs, function () {
          self.runAppMain(appjs);
        });  
      }
    });
  }
}

runJob.prototype.getModify = function(cb){
  var appjs=[];
  var moudlejs = [];
  var self = this;
  
  // node transform --file=...中的file参数
  if(argv.file){
    if(/appjs\\/.test(argv.file)){
      appjs.push(argv.file);
    } else if (/moudlejs\\/.test(argv.file)) {
      var jsfile = argv.file.replace(/\\/g,'/');
      moudlejs.push(jsfile);
    }
  }

  gruntBySingleFile.getGitStatus(function(logs){
    //从git status记录中找出改变的js源文件，分别放入appjs和modulejs数组
    logs.forEach(function(item){
      if(item.indexOf('dist') == -1){
        if(/appjs\//.test(item)){
          var items = item.split(' ');
          appjs.push(items[items.length-1]);
        }else if(/moudlejs\//.test(item)){
          var items = item.split(' ');
          moudlejs.push(items[items.length-1]);
        }
      }
    });

    console.log('获取变更记录', "appjs", appjs.length, "moudlejs", moudlejs.length);

    // 如果modulejs被修改则找到依赖该模块的appjs，添加到修改的appjs数组中
    if(moudlejs.length){
      var alllist = [];
      var moudlejsindex=0;
      var allmoudlejslength = moudlejs.length;
      moudlejs.forEach(function(item){
        var moudlejsitem = item;
        var temp = item.replace('moudlejs/','');
        temp = temp.replace('.js','');
        // console.log('获取依赖',moudlejsitem,'模块的appjs文件');
        alllist.push(moudlejsitem);

        self.getDependices(temp, function (list) {
          moudlejsindex++;
          // 此处list中可能存在与appjs数组中重复的记录
          alllist = alllist.concat(list);

          if(moudlejsindex == allmoudlejslength){
            //console.log("appjs", appjs, "alllist", alllist);
            cb(appjs.concat(alllist));
          }
        });
      });
    } else {
      cb(appjs);
    }
  });
}

runJob.prototype.getDependices = function(dependency, cb){
  var files = this.getAllFiles('appjs');
  var dependencyappjs = [];
  var promiseall = [];

  files.forEach((item, i)=>{
    let promise = new Promise(function (resolve, reject) {
      fs.readFile(item, 'utf-8', function (err, data) {
        if (err) throw err;
        var meta = ast.parseFirst(data);
        if (!meta) {
          resolve(1);
        } else {
          meta.dependencies.forEach(function(item2){
            if(item2==dependency){
              dependencyappjs.push(item);
              resolve(1);
              return;
            }
          });
          resolve(1);
        }
      });
    });
    promiseall.push(promise);
  });

  Promise.all(promiseall).then(
    function (res) {
      cb(dependencyappjs);
    }
  )
}

// 递归删除一个文件夹（包含所有子文件夹和文件）
runJob.prototype.deleteFolderRecursive = function(path) {
  var files = [];
  var self = this;
  if( fs.existsSync(path) ) {
    files = fs.readdirSync(path);
    files.forEach(function(file, index){
        var curPath = path + "/" + file;
        if(fs.statSync(curPath).isDirectory()) { // recurse
            self.deleteFolderRecursive(curPath);
        } else { // delete file
            fs.unlinkSync(curPath);
        }
    });
    fs.rmdirSync(path);
  }
}

// 深度优先读出给定目录下的所有js文件，以一个路径数组返回
runJob.prototype.getAllFiles = function (dirpath) {
    var filesArr = [];
    //var dir = ///$/.test(dir) ? dir : dir + '/';
    var path = dirpath;
    var readDirectory = function(temppath){
      let files = fs.readdirSync(temppath);
      files.forEach((item)=>{
        var temppath2 = temppath + "/" + item;
        let stats = fs.statSync(temppath2);
        if (stats.isFile()) {
          // if(temppath2.indexOf('.js') == -1){
          // 上面代码会把.js.bak或其他类型文件也加入处理
          if(!/\.js$/.test(temppath2)){
            return;
          }
          filesArr.push(temppath2);
        }  else if (stats.isDirectory ()) {
          //console.log(temppath2);
          readDirectory(temppath2);
        }    
      });
    }
    readDirectory(path);
    return filesArr;
}

runJob.prototype.needRebuild=function(){
  var self = this;

  // 先根据是否存在.build文件判断是否需要重新编译
  var exists = fs.existsSync('.build');
  if(!exists){
    return true;
  }

  var files =  self.getAllFiles('moudlejs').concat(self.getAllFiles('appjs'));
  // 根据.build目录下是否有modulejs和appjs文件夹下所有js文件判断是否需要重新编译
  for(var i = 0; i < files.length; i++){
    var builditem = '.build/' + files[i];
    var exists = fs.existsSync(builditem);
    if(!exists){
      return true;
      break;
    }
  }
  return false;
}

// 将指定文件复制到.build下并进行模块转化
runJob.prototype.runMoudlejs = function (appjs, cb) {
  if(appjs){
    var files = appjs;
  }else{
    var files =  this.getAllFiles('moudlejs').concat(this.getAllFiles('appjs'));
  }
  
  var self = this;
  var promiseall = [];
  // console.log('需要转移的文件', files, files.length);
  
  files.forEach((item,i)=>{
    let promise = new Promise(function (resolve, reject) {
      gruntBySingleFile.copyAllMoudlejs(item, (err) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(1);
        }
      });
    });
    promiseall.push(promise);
  });

  Promise.all(promiseall).then(
    function (res) {
      console.log('转移moudlejs,appjs并将cmd模块标准化保存在.build文件夹下成功');
      cb();
    }
  )
}

// 编译指定文件
runJob.prototype.runAppMain = function(appjs){
  var files = appjs || this.getAllFiles('appjs');
  var promiseall = [];

  // 逐个编译文件
  files.forEach((item,i) => {
    let promise = new Promise(function (resolve, reject) {
      gruntBySingleFile.compileSingleFile(item, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('done',i);
          resolve(1);
        }
      });
    });
    promiseall.push(promise);
  });

  Promise.all(promiseall).then(
    function (res) {
      console.log('全部完成');
    }
  );
}

try{
  new runJob();
}catch(e){
  throw e;
}
