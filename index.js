const fs = require('fs');
const cozy = require('cozy-client-js');

const package = require('./package.json');

const TOKEN_FILE = 'token.json'
const CLIENT_NAME = package.name.toUpperCase();
const SOFTWARE_ID = CLIENT_NAME + '-' + package.version;

const getClientWithoutToken = (url, docTypes = []) => {
  let permissions = docTypes.map(docType => (docType.toString() + ':ALL'))

  let cozyClient = new cozy.Client({
    cozyURL: url,
    oauth: {
      storage: new cozy.MemoryStorage(),
      clientParams: {
        redirectURI: 'http://localhost:3333/do_access',
        softwareID: SOFTWARE_ID,
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
      let stored = require('./' + TOKEN_FILE);

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

//convenience wrapper around the 2 client getters
const getClient = (generateNewToken, cozyUrl, docTypes) => {
  //now get a client
  const getClientFn = generateNewToken ? getClientWithoutToken : getClientWithToken;

  return getClientFn(cozyUrl, docTypes)
  .then(client => {
    return client;
  })
  .catch(err => {
    if (err.message === "ENOENT: no such file or directory, open '"+TOKEN_FILE+"'")
      console.warn('No stored token found, are you sure you generated one? Use option "-t" if you want to generate one next time.');
    else
      console.warn(err);

    return err;
  });
}

//imports a set of data. Data must be a map, with keys being a doctype, and the value an array of attributes maps.
const importData = (cozyClient, data) => {
  for (const docType in data){
    const docs = data[docType];
    
    Promise.all(docs.map(doc => cozyClient.data.create(docType, doc)))
    .then(results => {
      console.log('Imported ' + results.length + ' ' + docType + ' document' + (results.length > 1 ? 's' : ''));
      console.log(results.map(result => (result._id)));
      console.log(results);
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

//drop all documents of the given doctype
const dropCollections = (client, docTypes) => {
  for (const docType of docTypes){
    //we're going to need all the document ids and revisions, but for that we need an index
    client.data.defineIndex(docType, ['_id'])
    .then(index => {
      //now let's fetch all the data
      return client.data.query(index, {
        selector: {'_id': {"$gt" : null}},
        fields: ['_id', '_rev']
      });
    })
    .then(docs => {
      //well now we drop them all...
      return Promise.all(docs.map(doc => (client.data.delete(docType, doc))))
    })
    .then(results => {
      console.log('Deleted ' + results.filter(result => (result.deleted)).length + '/' + results.length + ' documents.');
    })
    .catch(err => {
      console.warn(err);
    });
  }
}

//the CLI interface
let program = require('commander');
program
.version(package.version)
.option('-t --token', 'Generate a new token.')
.option('-u --url <url>', 'URL of the cozy to use. Defaults to "http://cozy.tools:8080".');

//impor command
program.command('import [file]')
.description('The file containing the JSON data to import. Defaults to "example-data.json".')
.action(file => {
  if (!file) file = 'example-data.json';
  
  const dummyjson = require('dummy-json')
  
  //get the url of the cozy
  const cozyUrl = program.url ? program.url.toString() : 'http://cozy.tools:8080';
  
  //collect the doctypes that we're going to import
  let docTypes = [];
  let template = fs.readFileSync(file, {encoding: 'utf8'});
  
  let data = JSON.parse(dummyjson.parse(template));
  
  for (let docType in data) {
    docTypes.push(docType);
  }
  
  //get a client
  getClient(!!program.token, cozyUrl, docTypes)
  .then(client => {
    importData(client, data);
  });
});

//is this a good idea?
program.command('drop <doctypes...>')
.description('Deletes all documents of the provided doctypes. For real.')
.action(docTypes => {
  const readline = require('readline');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Are you sure? EVERY document of type ' + docTypes.join(', ') + ' will be removed. Type yes to confirm.\n', (answer) => {
    rl.close();
    
    if (answer === 'yes'){
      console.log('Okay, hang tight.');
      //get the url of the cozy
      const cozyUrl = program.url ? program.url.toString() : 'http://cozy.tools:8080';
      
      getClient(!!program.token, cozyUrl, docTypes)
      .then(client => {
        dropCollections(client, docTypes);
      });
    }
    else {
      console.log('Thought so.');
    }
  });
})

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}