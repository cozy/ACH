const fs = require('fs')

const config = JSON.parse(
  fs.readFileSync(`${process.env.HOME}/.ACH.json`).toString()
)

module.exports = config
