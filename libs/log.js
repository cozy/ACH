const colors = require('colors')

const green = colors.green
const blue = colors.blue
const gray = colors.gray
const yellow = colors.yellow
const red = colors.red

const writeLnErr = msg => {
  process.stderr.write(msg + '\n')
}

module.exports = {
  success: function(msg) {
    writeLnErr(green(msg))
  },

  info: function(msg) {
    writeLnErr(blue(msg))
  },

  debug: function(msg) {
    writeLnErr(gray(msg))
  },

  warn: function(msg) {
    writeLnErr(yellow(msg))
  },

  error: function(msg) {
    writeLnErr(red(msg))
  }
}
