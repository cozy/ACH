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
      return { err: true, errorMessage: e.message, path: path }
    }
  })
  const ok = results.filter(result => result.ok)
  if (ok.length === 0) {
    console.error(`Tried ${results.map(x => x.path).join(',')}`)
    const errors = results
      .filter(result => result.err)
      .filter(
        result => result.errorMessage !== `Cannot find module '${result.path}'`
      )
      .map(result => `${result.path}: ${result.errorMessage}`)
    if (errors.length > 0) {
      throw new Error(errors[0])
    } else {
      throw new Error(`No script found for name ${scriptName}`)
    }
  } else if (ok.length === 1) {
    return ok[0].script
  } else {
    console.error(`Conflicting paths: ${ok.map(x => x.path).join(',')}`)
    throw new Error(`Conflicting scripts found for ${scriptName}`)
  }
}

/** List all builtin scripts */
const list = () => {
  const walkDir = dir => {
    let files = []
    const dirContent = fs.readdirSync(dir)
    dirContent.forEach(fileOrDir => {
      const pathFileOrDir = path.join(dir, fileOrDir)
      const stat = fs.statSync(pathFileOrDir)
      if (stat && stat.isDirectory()) {
        // Recursively walk in subdir
        files = files.concat(walkDir(pathFileOrDir))
      } else {
        if (/\.js$/.exec(fileOrDir) && !/\.spec\.js$/.exec(fileOrDir)) {
          const file = fileOrDir.replace(/\.js$/, '')
          files.push(file)
        }
      }
    })
    return files
  }
  const dir = path.join(__dirname, '../scripts')
  return walkDir(dir)
}

module.exports = {
  require: requireScript,
  list
}
