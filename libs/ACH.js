const deleteDocuments = require('./deleteDocuments')
const dropCollections = require('./dropCollections')
const importFolderContent = require('./importFolderContent')
const exportData = require('./exportData')
const getClient = require('./getClient')

class ACH {
  constructor (token, url, doctypes) {
    this.url = url
    this.token = token
    this.doctypes = doctypes
  }

  async connect () {
    try {
      console.log('Connecting to ', this.url)
      this.client = await getClient(this.token, this.url, this.doctypes)      
    } catch (e) {
      console.warn('Could not connect to', this.url)
      throw e
    }
  }
}

const handleBadToken = promise => {
  return promise.catch(err => {
    if (/Invalid JWT token/.test(err.reason.error)) {
      console.log('It seems your token is invalid, you may want to delete the token file and relaunch ACH.')
    } else {
      throw err
    }
  })
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
