const fs = require('fs')
const path = require('path')

/** Requires builtin script or from relative path */
const requireScript = scriptName => {
  const dir = path.join(__dirname, 'scripts')
  let script
  try {
    script = require(path.join(dir, scriptName))
  } catch (e) {
    console.log(e)
    console.error(`${scriptName} does not exist in ${dir}`)
    process.exit(1)
  }
}

/** List all builtin scripts */
const list = () => {
  const dir = path.join(__dirname, 'scripts')
  return fs
    .readdirSync(dir)
    .filter(x => /\.js$/.exec(x))
    .filter(x => !/\.spec\.js$/.exec(x))
    .map(x => x.replace(/\.js$/, ''))
}

module.exports = {
  require: requireScript,
  list
}
