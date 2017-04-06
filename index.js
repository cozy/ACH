const fs = require('fs')
const cozy = require('cozy-client-js')

const TOKEN_FILE = 'token.json'
const CLIENT_NAME = 'ACH'

const getClientWithoutToken = (url, docTypes = []) => {
  let permissions = docTypes.map(docType => (docType.toString() + ':ALL'))

  let cozyClient = new cozy.Client({
    cozyURL: url,
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

  return cozyClient.authorize().then((creds) => {
    let token = creds.token.accessToken;
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({token: token}), 'utf8');
    return cozyClient;
  })
}

//handle the redirect url in the oauth flow
const onRegistered = (client, url) => {
  const http = require('http');
  const opn = require('opn');

  let server
  
  return new Promise((resolve, reject) => {
    server = http.createServer((request, response) => {
      if (request.url.indexOf('/do_access') === 0) {
        resolve(request.url)
        response.end()
      }
    })
    
    server.listen(3333, () => {
      opn(url, {wait: false});
    })
  })
  .then(url => {
    server.close(); 
    return url; 
  }, err => {
    server.close(); 
    throw err; 
  });
}

//returns a client when there is already a stored token
const getClientWithToken = (url, docTypes) => {  
  return new Promise((resolve, reject) => {
    try {
      //try to load a locally stored token and use that
      let stored = JSON.parse(fs.readFileSync(TOKEN_FILE))

      let cozyClient = new cozy.Client()

      cozyClient.init({
        cozyURL: url,
        token: stored.token
      })
      
      resolve(cozyClient)
    }
    catch (err) {
      reject(err)
    }
  })
}

//imports a set of data. Data must be a map, with keys being a doctype, and the value an array of attributes maps.
const importData = (cozyClient, data) => {
  for (const docType in data){
    const docs = data[docType];
    
    Promise.all(docs.map(doc => (cozyClient.data.create(docType, doc))))
    .then(results => {
      console.log('Imported ' + results.length + ' ' + docType + ' document(s)');
      console.log(results.map(result => (result._id)));
    }, err => {
      if (err.name == 'FetchError' && err.status == 400){
        console.warn(err.reason.error);
      }
      else if (err.name == 'FetchError' && err.status == 403){
        console.warn('The server replied with 403 forbidden; are you sure the last generated token is still valid and has the correct permissions? You can generate a new one with the "-t" option.');
      }
      else {
        console.warn(err);
      }
    })
  }
}

//the CLI interface
let program = require('commander');
program
  .version('0.1')
  .option('-t --token', 'Generate a new token')
  .option('-u --url', 'URL of the cozy to use. Defaults to "http://cozy.tools:8080".')
  .option('-f --file', 'The file containing the JSON data to import. Defaults to "example-data.json".')
  .parse(process.argv);

//first preload the data to import. We'll need this to generate a token later
const dataFile = program.file ? program.file.toString() : 'example-data.json';
const data = JSON.parse(fs.readFileSync(dataFile));

//build the list of doctypes we want to manipulate
let docTypes = [];
for (let docType in data) {
  docTypes.push(docType);
}

//define the target url
const cozyUrl = program.url ? program.url.toString() : 'http://cozy.tools:8080';

//now get a client
let getClient = program.token ? getClientWithoutToken : getClientWithToken;

getClient(cozyUrl, docTypes)
.then(client => {
  //client loaded! The only thing we support at the moment is importing the data file, so let's do that.
  importData(client, data);
})
.catch(err => {
  if (err.message === "ENOENT: no such file or directory, open '"+TOKEN_FILE+"'")
    console.warn('No stored token found, are you sure you generated one? Use option "-t" if you want to generate one next time.');
  else
    console.warn(err);
})