const { ACH } = require('./libs')
const { queryAll } = require('./libs/utils')

const log = console.log.bind(console)

let client, data, files, intents, jobs, offline, settings, auth, fetchJSON, token

const doctypes = process.env.DOCTYPES ? process.env.DOCTYPES.split(',') : []
const domain = process.env.COZY_URL || 'http://cozy.tools:8080'
console.log(doctypes)
const ach = new ACH('/tmp/repl-ach.json', domain, doctypes.concat(['io.cozy.files', 'io.cozy.settings']))

const onConnection = () => {
  client = ach.client
  data = ach.client.data
  files = ach.client.files
  intents = ach.client.intents
  jobs = ach.client.jobs
  offline = ach.client.offline
  settings = ach.client.settings
  auth = ach.client.auth
  fetchJSON = ach.client.fetchJSON
  token = client._token.token
  console.log('token', token)
  console.log('Connected !')
}

const getAllDocuments = function (doctype) {
  return data.defineIndex(doctype, ['_id'])
    .then(mangoIndex => {
      return queryAll(client, mangoIndex, {
        selector: {'_id': {'$gt': null}},
        descending: true
      })
    }).then(docs => {
      console.log('Exported documents for ', doctype, ':', docs.length)
      console.log(JSON.stringify(docs, null, 2))
      return docs
    })
}

const run = function () {
  return ach.connect().then(onConnection).then(() => ({
    client,
    data,
    files,
    intents,
    jobs,
    offline,
    settings,
    auth,
    fetchJSON,
    ach
  }))
}

module.exports = run
