const fs = require('fs')
const cozy = require('cozy-client-js')

const TOKEN_FILE = 'token.json'
const CLIENT_NAME = 'ACH'

const COZY_URL = process.argv.length > 2 ? process.argv[2] : 'http://cozy.tools:8080'
const DATA_FILE = process.argv.length > 3 ? process.argv[3] : 'data.json'

const data = JSON.parse(fs.readFileSync(DATA_FILE))

//returns a cozy client instance, using the stored token or a new one
const getCozyClient = () => {  
  return new Promise((resolve, reject) => {
    let cozyClient = null
    
    try {
      //try to load a locally stored token and use that
      let stored = JSON.parse(fs.readFileSync(TOKEN_FILE))
      console.log('Using stored token')

      cozyClient = new cozy.Client()

      cozyClient.init({
        cozyURL: COZY_URL,
        token: stored.token
      })
      
      resolve(cozyClient)
    }
    catch (err) {
      //no token found, generate a new one
      console.log('Performing OAuth flow (' + err.toString() + ')')
      
      let permissions = []
      
      for (let docType in data) {
        permissions.push(docType.toString() + ':ALL')
      }
      
      cozyClient = new cozy.Client({
        cozyURL: COZY_URL,
        oauth: {
          storage: new cozy.MemoryStorage(),
          clientParams: {
            redirectURI: 'http://localhost:3333/do_access',
            softwareID: CLIENT_NAME,
            clientName: CLIENT_NAME,
            scopes: permissions
          },
          onRegistered: onRegistered,
        }
      })

      cozyClient.authorize().then((creds) => {
        let token = creds.token.accessToken;
        try {
          fs.writeFileSync(TOKEN_FILE, JSON.stringify({token: token}), 'utf8');
          resolve(cozyClient)
        }
        catch (err) {
          reject(err);
        }
      })
    }
  })
}

//handle the redirect url in the oauth flow
const onRegistered = (client, url) => {
  const http = require('http');
  const opn = require('opn');

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
      opn(url)
    })
  })
  .then(
    (url) => { server.close(); return url },
    (err) => { server.close(); throw err }
  )
}

//start the actual import
getCozyClient().then(cozyClient => {
  for (const docType in data){
    const docs = data[docType];
    
    Promise.all(docs.map(doc => (cozyClient.data.create(docType, doc))))
    .then(result => {
      console.log(result)
    }, error => {
      console.warn(error)
    })
    
  }
})