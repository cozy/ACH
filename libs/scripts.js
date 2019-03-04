const fs = require('fs')
const path = require('path')

/** Requires builtin script or from relative path */
const requireScript = scriptName => {
  const results = [
    path.resolve(scriptName),
    path.join(__dirname, '../scripts', scriptName)
  ].map(path => {
    try {
      return { ok: true, path, script: require(path) }
    } catch (e) {
      return { err: true, path: path }
    }
  })
  const ok = results.filter(result => result.ok)
  if (ok.length === 0) {
    console.error(`Tried ${results.map(x => x.path).join(',')}`)
    throw new Error(`No script found for name ${scriptName}`)
  } else if (ok.length === 1) {
    return ok[0].script
  } else {
    console.error(`Conflicting paths: ${ok.map(x => x.path).join(',')}`)
    throw new Error(`Conflicting scripts found for ${scriptName}`)
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
