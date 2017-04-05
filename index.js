const http = require('http');
const opn = require('opn');
const cozy = require('cozy-client-js')

function onRegistered(client, url) {
  let server
  return new Promise((resolve) => {
    server = http.createServer((request, response) => {
      if (request.url.indexOf('/do_access') === 0) {
        console.log('Received access from user with url', request.url)
        resolve(request.url)
        response.end()
      }
    })
    server.listen(3333, () => {
      opn(url);
    })
  })
    .then(
      (url) => { server.close(); return url; },
      (err) => { server.close(); throw err; }
    )
}

const cozyClient = new cozy.Client({
  cozyURL: 'http://cozy.tools:8080',
  oauth: {
    storage: new cozy.MemoryStorage(),
    clientParams: {
      redirectURI: 'http://localhost:3333/do_access',
      softwareID: 'ACH-0.1',
      clientName: 'ACH!',
      scopes: ['files/images:read']
    },
    onRegistered: onRegistered,
  }
})

cozyClient.authorize().then((creds) => console.log(creds))