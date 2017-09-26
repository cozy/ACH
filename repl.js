const { ACH } = require('./libs')

const log = console.log.bind(console)

let data, files, intents, jobs, offline, settings, auth, fetchJSON

const ach = new ACH('/tmp/repl-ach.json', 'https://isabelledurand.cozy.rocks', ['io.cozy.files'])
const onConnection = () => {
    data = ach.client.data
    files = ach.client.files
    intents = ach.client.intents
    jobs = ach.client.jobs
    offline = ach.client.offline
    settings = ach.client.settings
    auth = ach.client.auth
    fetchJSON = ach.client.fetchJSON
    console.log('Connected !')
}

ach.connect().then(onConnection)
console.log('Connecting..')
