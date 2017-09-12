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
    return method.apply(this, args)
  }
})

module.exports = ACH
