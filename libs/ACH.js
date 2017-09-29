const deleteDocuments = require('./deleteDocuments')
const dropCollections = require('./dropCollections')
const importFolderContent = require('./importFolderContent')
const exportData = require('./exportData')
const getClient = require('./getClient')
const cozyFetch = require('./cozyFetch')

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

const updateSettings = function (client, attrs) {
  let instance
  return this.fetch('GET', '/settings/instance').then(data => {
    instance = data
    instance.data.attributes = { ...instance.data.attributes, ...attrs }
    return this.fetch('PUT', '/settings/instance', instance)
  }).then(settings => {
    console.log('Updated settings\n', JSON.stringify(settings.data.attributes, null, 2))
  })
}

const methods = {
  deleteDocuments,
  dropCollections,
  importFolder: importFolderContent,
  export: exportData,
  fetch: cozyFetch,
  updateSettings: updateSettings
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
