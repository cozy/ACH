#!/usr/bin/env node 

const fs = require('fs')
const appPackage = require('./package.json')
const path = require('path')

const { merge } = require('lodash')
const Handlebars = require('handlebars')
const askConfirmation = require('./libs/askConfirmation')

const {
  ACH,
  importData,
  assert
} = require('./libs')

const DEFAULT_COZY_URL = 'http://cozy.tools:8080'
const TOKEN_FILE = './token.json'

// the CLI interface
let program = require('commander')
program
.version(appPackage.version)
.option('-t --token [token]', 'Token file to use (defaults to token.json)', TOKEN_FILE)
.option('-y --yes', 'Does not ask for confirmation on sensitive operations')
.option('-u --url [url]', `URL of the cozy to use. Defaults to "${DEFAULT_COZY_URL}".'`, DEFAULT_COZY_URL)


function fileExists (p) {
  if (p && !fs.existsSync(path.resolve(p))) {
    return false
  } else {
    return true
  }
}

program.command('import [filepath] [handlebarsOptionsFile]')
.description('The file containing the JSON data to import. Defaults to "example-data.json". Then the dummy helpers JS file (optional).')
.action((filepath, handlebarsOptionsFile) => {
  assert(fileExists(filepath), `${filepath} does not exist`)
  assert(fileExists(handlebarsOptionsFile), `${handlebarsOptionsFile} does not exist`)
  const {url, token} = program
  return importData(url, token, filepath, handlebarsOptionsFile)
})

program.command('importDir [directoryPath]')
.description('The path to the directory content to import. Defaults to "./DirectoriesToInject".')
.action(directoryPath => {
  if (!directoryPath) directoryPath = './DirectoriesToInject'

  // get directories tree in JSON format
  const dirTree = require('directory-tree')
  const JSONtree = dirTree(directoryPath, {})

  const {url, token} = program
  const ach = new ACH(token, url, ['io.cozy.files'])
  ach.connect().then(() => {
    return ach.importFolder(client, JSONtree)
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

program.command('export [doctypes] [filename]')
.description('Exports data from the doctypes (separated by commas) to filename')
.action((doctypes, filename) => {
  doctypes = doctypes.split(',')
  const {url, token} = program
  const ach = new ACH(token, url, doctypes)
  ach.connect().then(() => {
    return ach.export(doctypes, filename)
  })
})

program.command('delete [doctype] <ids...>')
.description('Delete document(s)')
.action((doctype, ids) => {
  const {url, token} = program
  const ach = new ACH(token, url, [doctype])
  ach.connect().then(() => {
    return ach.deleteDocuments(client, doctype, ids)
  })
})

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.help()
}
