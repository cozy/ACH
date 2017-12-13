const colors = require('colors')

const green = colors.green
const blue = colors.blue
const gray = colors.gray
const yellow = colors.yellow
const red = colors.red

module.exports = {
  success: function (msg) {
    console.log(green(msg))
  },

  info: function (msg) {
    console.log(blue(msg))
  },

  debug: function (msg) {
    console.log(gray(msg))
  },

  warn: function (msg) {
    console.warn(yellow(msg))
  },

  error: function (msg) {
    console.warn(red(msg))
  }
}
