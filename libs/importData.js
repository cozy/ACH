const getClient = require('./getClient')
const path = require('path')
const fs = require('fs')
const Handlebars = require('handlebars')
const dirTree = require('directory-tree')
const { merge, once } = require('lodash')

const { uploadFile } = require('./utils')
const assert = require('./assert')
const {
  runSerially,
  runParallel,
  runParallelAfterFirst
} = require('./promises')

const FILE_DOCTYPE = 'io.cozy.files'
const H = Handlebars.create()

// We save results from cozy imports here
// to be able to retrieve it inside the template
// It is useful when a document needs to be able
// to reference another one
const metadata = {}
const saveMetadata = function (doctype, result) {
  metadata[doctype] = metadata[doctype] || []
  metadata[doctype].push(result)
}

const getMetadata = function (doctype, index, field) {
  try {
    return metadata[doctype][index][field]
  } catch (e) {
    console.warn('Could not find any metadata for ', doctype, index)
    throw e
  }
}

const singleQuoteString = function (value) {
  if (typeof value == 'string') {
    return `'${value}'`
  } else {
    return value 
  }
} 

/**
 * Creates a helper that will stay same after being processed by Handlebars
 * 
 * There are two Handlebars passes on the data :
 * 
 * 1. At load time to create dummy data
 * 2. When the data is being inserted so that we can reference data being created 
 *
 * Since we need the `reference` helper to stay the same for the second pass, we
 * create it with `passthroughHelper`.
 * 
 * @param  {string}   name     - The name of the created helper
 * @param  {function} callback - Callback to run when the helper is executed
 * @return {string}            - A helper that when called will creates itself
 *
 * @example
 * const reference = passthroughHelper('reference')
 * Handlebars.registerHelper({ reference })
 * const str = Handlebars.compile("{{ reference 'io.cozy.files' 0 '_id' }}")()
 * > str = "{{ reference 'io.cozy.files' 0 '_id' }}"
 */
const passthroughHelper = function (name, callback) {
  return function () {
    callback && callback()
    return new Handlebars.SafeString(
      `{{ ${name} ${Array.from(arguments).slice(0, -1).map(singleQuoteString).join(' ')} }}`)
  }
}

const runTemplate = function (str) {
  return H.compile(str)({})
}

const applyHelpers = function (data) {
  return JSON.parse(runTemplate(JSON.stringify(data)))
}


/**
 * If the document is a file, will take appropriate action to have it
 * uploaded, looks at the __SRC__ and __DEST__ fields of the document
 * to know where is the file and where to put it.
 */
const createDocumentFromDescription = function (client, doctype, data) {
  return Promise.resolve().then(() => {
    if (doctype === FILE_DOCTYPE) {
      const src = data.__SRC__
      const dest = data.__DEST__
      if (!src || !dest) {
        throw new Error('No src/dest')
      }
      const fileJSON = dirTree(src)
      if (!fileJSON) {
        throw new Error('File error ' + src)
      }
      return uploadFile(client, fileJSON, '', true)
    } else {
      return client.data.forceCreate(doctype, data)
    }
  })
}

/**
 * Create a document from the JSON description.
 *
 * - Process the JSON to have access to the metadata helper
 *   if we need to access data from objects that just have
 *   been created
 * - Saves the returned metadata in the metadata object if we
 * need it to access it with the metadata helper.
 *
 * @param  {CozyClient} client  - Cozy client
 * @param  {String} doctype 
 * @param  {Object} data    - Document to be created
 * @return {Promise}
 */
const createDoc = function (client, doctype, data) {
  data = applyHelpers(data)
  return createDocumentFromDescription(client, doctype, data, true).then(function (result) {
    saveMetadata(doctype, result)
    return result
  }).catch(err => {
    console.log('Oops! An error occured.')
    if (err.name === 'FetchError' && err.status === 400) {
      console.warn(err.reason.error)
    } else if (err.name === 'FetchError' && err.status === 403) {
      console.warn('The server replied with 403 forbidden; are you sure the last generated token is still valid and has the correct permissions? You can generate a new one with the "-t" option.')
    } else if (err.name === 'FetchError' && err.status === 409) {
      console.warn('Document update conflict: ' + err.url)
    } else {
      console.warn(err)
    }
    throw err
  })
}



const importData = function (cozyClient, data, options) {
    // Even if we are in parallel mode, insert the first document serially, and then all the other ones in parallel.
    // because if it's a new doctype, the stack needs time to create the collection
    // and can't handle the other incoming requests
  const runPerDoctype = options.parallel ? runParallel : runSerially
  const runPerDocument = options.paralel ? runParallelAfterFirst : runSerially

  return runPerDoctype(Object.keys(data), doctype => {
    let docs = data[doctype]
    return runPerDocument(docs, doc => createDoc(cozyClient, doctype, doc))
      .then(results => {
        console.log('Imported ' + results.length + ' ' + doctype + ' document' + (results.length > 1 ? 's' : ''))
        console.log(results.map(result => (result._id)))
      })
  })
}

/**
 * Imports data from a JSON file
 *
 * The JSON is processed with dummy-json so that fixtures can be created easily.
 *
 * Objects can also reference the current directory of the file with {{ dir }}
 * and reference objects created before them with {{ reference doctype index field }}
 *
 */
module.exports = (cozyUrl, createToken, filepath, handlebarsOptionsFile) => {
  if (!filepath) filepath = 'example-data.json'
  const dummyjson = require('dummy-json')
  const template = fs.readFileSync(filepath, {encoding: 'utf8'})
  const templateDir = path.dirname(path.resolve(filepath))

  // dummy-json pass helpers
  const options = { parallel: true }
  const turnOffParallelism = once(function () {
    console.log('Turning off parallelism since {{ reference }} helper is used.')
    options.parallel = false
  })

  let handlebarsOptions = {
    helpers: {
      dir: passthroughHelper('dir'),
      reference: passthroughHelper('reference', turnOffParallelism)
    }
  }

  if (handlebarsOptionsFile) {
    handlebarsOptions = merge(handlebarsOptions, require(`./${handlebarsOptionsFile}`))
  }

  // dummy-json pass passthrough helpers
  const data = JSON.parse(dummyjson.parse(template, handlebarsOptions))
  const doctypes = Object.keys(data)

  // We register 2nd pass helpers
  H.registerHelper({
    dir: templateDir,
    reference: getMetadata,
  })

  return getClient(createToken, cozyUrl, doctypes).then(client => {
    return importData(client, data, options)
  })
}
