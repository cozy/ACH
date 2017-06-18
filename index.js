#!/usr/bin/env node

const fs = require('fs')
const appPackage = require('./package.json')

const lib = require('./lib')

const DEFAULT_COZY_URL = 'http://cozy.tools:8080'

// the CLI interface
let program = require('commander')
program
.version(appPackage.version)
.option('-t --token', 'Generate a new token.')
.option('-y --yes', 'Does not ask for confirmation on sensitive operations')
.option(`-u --url <url>', 'URL of the cozy to use. Defaults to "${DEFAULT_COZY_URL}".'`)

// import command
program.command('import [dataFile] [helpersFile]')
.description('The file containing the JSON data to import. Defaults to "example-data.json". Then the dummy helpers JS file (optional).')
.action((dataFile, helpersFile) => {
  if (!dataFile) dataFile = 'example-data.json'
  // dummy helpers
  let helpers = null
  if (helpersFile) helpers = require(`./${helpersFile}`)

  const dummyjson = require('dummy-json')

  // get the url of the cozy
  const cozyUrl = program.url ? program.url.toString() : DEFAULT_COZY_URL

  // collect the doctypes that we're going to import
  let docTypes = []
  let template = fs.readFileSync(dataFile, {encoding: 'utf8'})

  let data = helpersFile
    ? JSON.parse(dummyjson.parse(template, helpers))
    : JSON.parse(dummyjson.parse(template))

  for (let docType in data) {
    docTypes.push(docType)
  }

  // get a client
  lib.getClient(!!program.token, cozyUrl, docTypes)
  .then(client => {
    lib.importData(client, data)
  })
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
  lib.getClient(!!program.token, cozyUrl, ['io.cozy.files'])
  .then(client => {
    lib.importFolderContent(client, JSONtree)
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
.action(docTypes => {
  const question = `This doctypes will be removed.

${docTypes.map(x => `* ${x}`).join(' \n')}

Type "yes" if ok.
`
  const confirm = program.yes ? function (question, cb) { cb() } : askConfirmation
  confirm(question, () => {
    // get the url of the cozy
    const cozyUrl = program.url ? program.url.toString() : DEFAULT_COZY_URL
    lib.getClient(!!program.token, cozyUrl, docTypes)
      .catch(err => {
        console.error('Error while getting token:', err)
      })
      .then(client => {
        return lib.dropCollections(client, docTypes)
      })
      .then(res => {
        process.exit()
      })
      .catch(err => {
        console.error('Error while dropping collections', err)
      })
  }, () => {
    console.log('Thought so')
  })
})

program.command('export [docTypes] [filename]')
.description('Exports data from the doctypes (separated by commas) to filename')
.action((docTypes, filename) => {
  // get a client
  docTypes = docTypes.split(',')
  const cozyUrl = program.url ? program.url.toString() : DEFAULT_COZY_URL
  lib.getClient(!!program.token, cozyUrl, docTypes)
  .then(client => {
    lib.exportData(client, docTypes, filename)
  })
})

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.help()
}
