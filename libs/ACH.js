const deleteDocuments = require('./deleteDocuments')
const dropCollections = require('./dropCollections')
const importFolderContent = require('./importFolderContent')
const exportData = require('./exportData')
const getClient = require('./getClient')
const { handleBadToken } = require('../libs/utils')

class ACH {
  constructor (token, url, doctypes) {
    this.url = url
    this.token = token
    this.doctypes = doctypes
  }

  connect () {
    console.log('Connecting to ', this.url)
    return getClient(this.token, this.url, this.doctypes)
      .then(client => {
        this.client = client
      }).catch(err => {
        console.warn('Could not connect to', this.url)
        throw err
      })
  }
}

const methods = {
  deleteDocuments,
  dropCollections,
  importFolder: importFolderContent,
  export: exportData
}
Object.keys(methods).forEach(name => {
  const method = methods[name]
  ACH.prototype[name] = function () {
    if (!this.client) {
      throw new Error('You need to call connect() before using ' + name)
    }
    const args = [].slice.call(arguments)
    args.unshift(this.client)
    return handleBadToken(method.apply(this, args))
  }
})

module.exports = ACH
