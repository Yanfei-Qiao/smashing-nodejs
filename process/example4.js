/**
 * 运行一个继承自EventEmitter，并在自身中触发一个事件的构造函数
 * 如果直接调用，由于还未绑定事件回调函数，触发会失败
 * 使用process.nextTick()就会成功
 */
const EventEmitter = require('events');
const util = require('util');

function MyEmitter() {
  EventEmitter.call(this);
  // this.emit('event');
  // use nextTick to emit the event once a handler is assigned
  process.nextTick(function() {
    this.emit('event');
  }.bind(this));
}
util.inherits(MyEmitter, EventEmitter);

const myEmitter = new MyEmitter();
myEmitter.on('event', function() {
  console.log('an event occurred!');
});