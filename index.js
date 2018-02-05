#!/usr/bin/env node

const fs = require('fs')
const _ = require('lodash')
const appPackage = require('./package.json')
const path = require('path')
const { merge } = require('lodash')
const Handlebars = require('handlebars')

const {
  ACH,
  importData,
  assert,
  log,
  askConfirmation
} = require('./libs')

const DEFAULT_COZY_URL = 'http://cozy.tools:8080'

// Add promise rejection handling
process.on('unhandledRejection', function (err) {
  log.error('Unhandled promise rejection.\n' + err.stack)
});

// the CLI interface
let program = require('commander')
program
.version(appPackage.version)
.option('-t --token [token]', 'Token file to use')
.option('-y --yes', 'Does not ask for confirmation on sensitive operations')
.option('-u --url [url]', `URL of the cozy to use. Defaults to "${DEFAULT_COZY_URL}".'`, DEFAULT_COZY_URL)


function fileExists (p) {
  if (p && !fs.existsSync(path.resolve(p))) {
    return false
  } else {
    return true
  }
}

program.command('import <filepath> [handlebarsOptionsFile]')
.description('The file containing the JSON data to import. Defaults to "example-data.json". Then the dummy helpers JS file (optional).')
.action((filepath, handlebarsOptionsFile) => {
  assert(fileExists(filepath), `${filepath} does not exist`)
  assert(fileExists(handlebarsOptionsFile), `${handlebarsOptionsFile} does not exist`)
  const {url, token} = program
  return importData(url, token, filepath, handlebarsOptionsFile)
})

program.command('importDir <directoryPath>')
.description('The path to the directory content to import. Defaults to "./DirectoriesToInject".')
.action(directoryPath => {
  if (!directoryPath) directoryPath = './DirectoriesToInject'

  // get directories tree in JSON format
  const dirTree = require('directory-tree')
  const JSONtree = dirTree(directoryPath, {})

  const {url, token} = program
  const ach = new ACH(token, url, ['io.cozy.files'])
  ach.connect().then(() => {
    return ach.importFolder(JSONtree)
  })
})

program.command('drop <doctypes...>')
.description('Deletes all documents of the provided doctypes. For real.')
.action(doctypes => {
  const question = `This doctypes will be removed.

${doctypes.map(x => `* ${x}`).join(' \n')}

Type "yes" if ok.
`
  const confirm = program.yes ? function (question, cb) { cb() } : askConfirmation
  confirm(question, () => {
    // get the url of the cozy
    const {url,token} = program
    const ach = new ACH(token, url, doctypes)
    ach.connect().then(() => {
      return ach.dropCollections(doctypes)
    })
  }, () => {
    console.log('Cancelled drop')
  })
})

program.command('export <doctypes> <filename>')
.description('Exports data from the doctypes (separated by commas) to filename')
.action((doctypes, filename) => {
  doctypes = doctypes.split(',')
  const {url, token} = program
  const ach = new ACH(token, url, doctypes)
  ach.connect().then(() => {
    return ach.export(doctypes, filename)
  })
})

program.command('delete <doctype> <ids...>')
.description('Delete document(s)')
.action((doctype, ids) => {
  const {url, token} = program
  const ach = new ACH(token, url, [doctype])
  ach.connect().then(() => {
    return ach.deleteDocuments(doctype, ids)
  })
})

program.command('updateSettings')
.description('Update settings')
.action(settings => {
  const {url, token} = program
  settings = JSON.parse(settings)
  const ach = new ACH(token, url, ['io.cozy.settings'])
  ach.connect().then(() => {
    return ach.updateSettings(settings)
  })
})

program.command('script <scriptName>')
.option('-x, --execute', 'Execute the script (disable dry run)')
.option('-d, --doctypes', 'Print necessary doctypes (useful for automation)')
.description('Launch script')
.action(function (scriptName, action) {
  const dir = path.join(__dirname, 'scripts')
  let script
  try {
    script = require(path.join(dir, scriptName))
  } catch (e) {
    console.log(e)
    console.error(`${scriptName} does not exist in ${dir}`)
    process.exit(1)
  }
  const {url, token} = program
  const { getDoctypes, run } = script
  const doctypes = getDoctypes()
  if (action.doctypes) {
    console.log(doctypes.join(' '))
  } else {
    const ach = new ACH(token, url, doctypes)
    const dryRun = !action.execute
    log.info(`Launching script ${scriptName}...`)
    log.info(`Dry run : ${dryRun}`)
    ach.connect().then(() => {
      return run(ach, dryRun)
    })
  }
})

program.parse(process.argv)
