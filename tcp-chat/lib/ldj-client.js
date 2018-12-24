const EventEmitter = require('events').EventEmitter;
class LDJClient extends EventEmitter {
  constructor(stream) {
    super();
    let buffer = '';
    stream.on('data', data => {
      buffer += data;
      let boundary = buffer.indexOf('\n\r');
      if (boundary != -1) {
        const input = buffer.substring(0, boundary);
        buffer = buffer.substring(boundary);
        this.emit('message', JSON.parse(input));
        boundary = buffer.indexOf('\n\r');
      }
    });
  }

  static connect(stream) {
    return new LDJClient(stream);
  }
}

module.exports = LDJClient;