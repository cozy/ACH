#!/usr/bin/env node --inspect

const fs = require('fs')
const appPackage = require('./package.json')
const path = require('path')

const { merge } = require('lodash')
const Handlebars = require('handlebars')

const {
  dropCollections,
  exportData,
  getClient,
  importData,
  importFolderContent,
  assert
} = require('./libs')

const DEFAULT_COZY_URL = 'http://cozy.tools:8080'

// the CLI interface
let program = require('commander')
program
.version(appPackage.version)
.option('-t --token', 'Generate a new token.')
.option('-y --yes', 'Does not ask for confirmation on sensitive operations')
.option(`-u --url <url>', 'URL of the cozy to use. Defaults to "${DEFAULT_COZY_URL}".'`)


function fileExists (p) {
  if (p && !fs.existsSync(path.resolve(p))) {
    return false
  } else {
    return true
  }
}
// import command

program.command('import [filepath] [handlebarsOptionsFile]')
.description('The file containing the JSON data to import. Defaults to "example-data.json". Then the dummy helpers JS file (optional).')
.option('[filepath]', 'File to import')
.option('[handlebarsOptionsFile]', 'File that exports Handlebars options')
.action((filepath, handlebarsOptionsFile) => {
  assert(fileExists(filepath), `${filepath} does not exist`)
  assert(fileExists(handlebarsOptionsFile), `${handlebarsOptionsFile} does not exist`)
  const cozyUrl = program.url ? program.url.toString() : DEFAULT_COZY_URL
  const createToken = !!program.token
  return importData(cozyUrl, createToken, filepath, handlebarsOptionsFile)
})

// import directories command
// All the root folder content is imported, not the root folder itself (DirectoriesToInject by default)
program.command('importDir [directoryPath]')
.description('The path to the directory content to import. Defaults to "./DirectoriesToInject".')
.action(directoryPath => {
  if (!directoryPath) directoryPath = './DirectoriesToInject'

  // get directories tree in JSON format
  const dirTree = require('directory-tree')
  const JSONtree = dirTree(directoryPath, {})

  // get the url of the cozy
  const cozyUrl = program.url ? program.url.toString() : DEFAULT_COZY_URL

  // get a client
  getClient(!!program.token, cozyUrl, ['io.cozy.files'])
  .then(client => {
    importFolderContent(client, JSONtree)
  })
})

const askConfirmation = function (question, callback, elseCallback) {
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question(question, function (answer) {
    rl.close()
    if (answer === 'yes') {
      callback()
    } else {
      elseCallback()
    }
  })
}

// is this a good idea?
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
    const cozyUrl = program.url ? program.url.toString() : DEFAULT_COZY_URL
    getClient(token, url, doctypes)
      .catch(err => {
        console.error('Error while getting token:', err)
      })
      .then(client => {
        return dropCollections(client, doctypes)
      })
      .catch(err => {
        console.error('Error while dropping collections', err)
      })
  }, () => {
    console.log('Thought so')
  })
})

program.command('export [doctypes] [filename]')
.description('Exports data from the doctypes (separated by commas) to filename')
.action((doctypes, filename) => {
  // get a client
  const cozyUrl = program.url ? program.url.toString() : DEFAULT_COZY_URL
  getClient(!!program.token, cozyUrl, docTypes)
  doctypes = doctypes.split(',')
  .then(client => {
    exportData(client, doctypes, filename)
  })
})

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.help()
}
