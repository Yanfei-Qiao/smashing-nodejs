// process.stdin.on('data', (chunk) => {
//   process.stdout.write('进程接收到数据' + chunk)
// })

// console.log(process.argv)

// 查看内存使用信息
console.log(process.memoryUsage())

// 查看进程当前工作目录
console.log(process.cwd())
// 修改Node.js应用程序中使用的当前工作目录
process.chdir('..')
console.log(process.cwd())

// 查看进程的id
console.log(process.pid)
// 杀死进程
// process.kill(process.pid)

console.log(process.env.NODE_ENV)

sayYou()
// 当应用程序抛出一个未被捕获的异常时触发进程对象的uncaughtException事件
process.on('uncaughtException',function(err){
  console.log('捕获到一个未被处理的错误:',err);
});

