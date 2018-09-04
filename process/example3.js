// timeout_vs_immediate.js
// setTimeout(function timeout() {
//   console.log('timeout');
// }, 0);

// setImmediate(function immediate() {
//   console.log('immediate');
// });

// timeout_vs_immediate.js
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => {
    console.log('timeout');
  }, 0);
  setImmediate(() => {
    console.log('immediate');
  });
});