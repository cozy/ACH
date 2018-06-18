const deleteDocuments = require('./deleteDocuments')
const dropCollections = require('./dropCollections')
const importFolderContent = require('./importFolderContent')
const createFiles = require('./createFiles')
const exportData = require('./exportData')
const getClient = require('./getClient')
const cozyFetch = require('./cozyFetch')
const log = require('./log')

const { handleBadToken } = require('../libs/utils')

const hashCode = function(str) {
  var hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16)
}

const getTokenPath = function (url, doctypes) {
  const key = url + ':' + doctypes.slice().sort().join(',')
  return '/tmp/.ach-token-' + hashCode(key) + '.json'
}

class ACH {
  constructor (token, url, doctypes) {
    this.url = url
    this.doctypes = doctypes
    this.token = token || getTokenPath(url, doctypes)
  }

  connect () {
    log.debug('Connecting to ' + this.url)
    return getClient(this.token, this.url, this.doctypes)
      .then(client => {
        this.client = client
      }).catch(err => {
        log.warn('Could not connect to' + this.url)
        throw err
      })
  }
}

const updateSettings = function (client, attrs) {
  let instance
  return this.fetch('GET', '/settings/instance').then(data => {
    instance = data
    instance.data.attributes = Object.assign({}, instance.data.attributes, attrs)
    return this.fetch('PUT', '/settings/instance', instance)
  }).then(settings => {
    log.info('Updated settings\n', JSON.stringify(settings.data.attributes, null, 2))
  })
}

const methods = {
  deleteDocuments,
  dropCollections,
  importFolder: importFolderContent,
  createFiles,
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
