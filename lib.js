const fs = require('fs')
const cozy = require('cozy-client-js')
const _ = require('lodash')
const appPackage = require('./package.json')

const TOKEN_FILE = 'token.json'
const CLIENT_NAME = appPackage.name.toUpperCase()
const SOFTWARE_ID = CLIENT_NAME + '-' + appPackage.version

const getClientWithoutToken = (url, docTypes = []) => {
  let permissions = docTypes.map(docType => (docType.toString() + ':ALL'))

  let cozyClient = new cozy.Client({
    cozyURL: url,
    oauth: {
      storage: new cozy.MemoryStorage(),
      clientParams: {
        redirectURI: 'http://localhost:3333/do_access',
        softwareID: SOFTWARE_ID,
        clientName: CLIENT_NAME,
        scopes: permissions
      },
      onRegistered: onRegistered
    }
  })

  return cozyClient.authorize().then((creds) => {
    let token = creds.token.accessToken
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({token: token}), 'utf8')
    return cozyClient
  })
}

// handle the redirect url in the oauth flow
const onRegistered = (client, url) => {
  const http = require('http')
  const opn = require('opn')

  let server

  return new Promise((resolve, reject) => {
    server = http.createServer((request, response) => {
      if (request.url.indexOf('/do_access') === 0) {
        resolve(request.url)
        response.end()
      }
    })

    server.listen(3333, () => {
      opn(url, {wait: false})
    })
  })
  .then(url => {
    server.close()
    return url
  }, err => {
    server.close()
    throw err
  })
}

// returns a client when there is already a stored token
const getClientWithToken = (url, docTypes) => {
  return new Promise((resolve, reject) => {
    try {
      // try to load a locally stored token and use that
      let stored = require('./' + TOKEN_FILE)

      let cozyClient = new cozy.Client()

      cozyClient.init({
        cozyURL: url,
        token: stored.token
      })

      resolve(cozyClient)
    } catch (err) {
      reject(err)
    }
  })
}

// convenience wrapper around the 2 client getters
module.exports.getClient = (generateNewToken, cozyUrl, docTypes) => {
  // now get a client
  const getClientFn = generateNewToken ? getClientWithoutToken : getClientWithToken

  return getClientFn(cozyUrl, docTypes)
  .then(client => {
    return client
  })
  .catch(err => {
    if (err.message === "ENOENT: no such file or directory, open '" + TOKEN_FILE + "'") {
      console.warn('No stored token found, are you sure you generated one? Use option "-t" if you want to generate one next time.')
    } else {
      console.warn(err)
    }

    return err
  })
}

// imports a set of data. Data must be a map, with keys being a doctype, and the value an array of attributes maps.
module.exports.importData = (cozyClient, data) => {
  let allImports = [];
  
  for (const docType in data) {
    let docs = data[docType]
    let first = docs.shift()
    let results = []

    // we insert the first document separetely, and then all the other ones in parallel.
    // this i because if it's a new doctype,, the stack needs some time to create the collection and can't handle the other incoming requests
    allImports.push(cozyClient.data.create(docType, first)
      .then(result => {
        results.push(result)
        return Promise.all(docs.map(doc => cozyClient.data.create(docType, doc)))
      })
      .then(nextResults => {
        results = results.concat(nextResults)
        console.log('Imported ' + results.length + ' ' + docType + ' document' + (results.length > 1 ? 's' : ''))
        console.log(results.map(result => (result._id)))
        // console.log(results);
      })
      .catch(err => {
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
      }))
  }
  
  Promise.all(allImports).then(process.exit, process.exit);
}

const writeFilePromise = promiscify(fs.writeFile)

const queryAll = function (cozyClient, mangoIndex, options) {
  return new Promise((resolve, reject) => {
    const documents = []
    var skip = options.skip || 0
    var fetch = function () {
      return cozyClient.data.query(
          mangoIndex, Object.assign({}, options, {
            wholeResponse: true,
            skip: skip
          }))
        .then(onSuccess)
         .catch(reject)
    }
    var onSuccess = function (response) {
      const docs = response.docs
      skip = skip + docs.length
      documents.push.apply(documents, docs)
      if (response.next) {
        fetch()
      } else {
        resolve(documents)
      }
    }
    fetch()
  })
}

module.exports.exportData = (cozyClient, doctypes, filename) => {
  console.log('Exporting data...')
  let allImports = [];
  
  const allExports = doctypes.map(doctype => {
    return cozyClient.data.defineIndex(doctype, ['_id'])
      .then(mangoIndex => {
        return queryAll(cozyClient, mangoIndex, {
          selector: {'_id': {'$gt': null}},
          descending: true,
        })
      }).then(docs => {
        console.log('Exported documents for ', doctype, ':', docs.length)
        return docs
      })
  })
  
  Promise.all(allExports)
    .then(function (data) {
      return _(doctypes)
        .zip(_.map(data, documents => _.map(documents, stripMeta)))
        .fromPairs()
        .value()
    })
    .then(data => {
      const json = JSON.stringify(data, null, 2)
      return writeFilePromise(filename, json)
    })
    .catch(function (err) {
      console.error(err)
    })
    .then(process.exit, process.exit);
}


const dropCollection = (client, docType) => {
  return client.data.defineIndex(docType, ['_id'])
    .then(index => {
      // now let's fetch all the data
      return queryAll(client, index, {
        selector: {'_id': {'$gt': null}},
        fields: ['_id', '_rev']
      })
    })
    .then(docs => {
      // well now we drop them all... 
      return Promise.all(docs.map(doc => client.data.delete(docType, doc)))
    })
    .then(results => {
      console.log('Deleted ' + results.filter(result => (result.deleted)).length + '/' + results.length + ' documents.')
      return results
    })
    .catch(err => {
      console.warn(err)
    })
}

// drop all documents of the given doctype
module.exports.dropCollections = (client, docTypes) => {
  const promises = docTypes.map(doctype => dropCollection(client, doctype))
  return Promise.all(promises)
}

// function to upload File (json format)
const uploadFile = (client, FileJSON, dirID) => {
  const readStream = fs.createReadStream(FileJSON.path)
  // must specify  the content-type here
  let contentType = ''
  switch (FileJSON.extension) {
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.png':
    case '.tiff':
      contentType = `image/${FileJSON.extension.substring(1)}`
      break
    case '.pdf':
      contentType = `application/pdf`
      break
    default:
      contentType = ''
      break
  }
  return client.files.create(readStream, {
    name: FileJSON.name,
    contentType,
    dirID: dirID || ''
  })
}

// function to upload a folder content (json format)
const uploadFolderContent = (client, FolderContentJSON, dirID) => {
  return client.files.createDirectory({
    name: FolderContentJSON.name,
    dirID: dirID || ''
  }).then(folderDoc => {
    if (FolderContentJSON.children) {
      return Promise.all(FolderContentJSON.children.map((child) => {
        if (child.children) { // it's a folder, use recursivity
          return uploadFolderContent(client, child, folderDoc._id)
        } else { // it's a file
          return uploadFile(client, child, folderDoc._id)
        }
      }))
    }
  })
  .catch(err => {
    return Promise.resolve(err)
  })
}

// imports a tree of directories/files. This tree must be in JSON format using directory-tree module
module.exports.importFolderContent = (client, JSONtree) => {
  return Promise.all(JSONtree.children.map((item) => {
    if (item.children) { // it's a folder
      return uploadFolderContent(client, item, '')
    } else { // it's a file
      return uploadFile(client, item, '')
    }
  })).then(() => {
    console.log(`${JSONtree.name} content imported`)
    process.exit()
  })
  .catch(err => {
    console.warn(err)
    process.exit()
  })
}

// helpers
function stripMeta (obj) {
  return _.omit(obj, ['_id', '_rev'])
}

function promiscify (fn) {
  return function () {
    const args = Array.from(arguments)
    const that = this
    return new Promise((fullfill, reject) => {
      const callback = function (err, res) {
        if (err) reject(err)
        else fullfill(res)
      }
      args.push(callback)
      fn.apply(that, args)
    })
  }
}

