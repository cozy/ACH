// imports a set of data. Data must be a map, with keys being a doctype, and the value an array of attributes maps.
module.exports = (cozyClient, data) => {
  let allImports = []

  for (const docType in data) {
    let docs = data[docType]
    let first = docs.shift()
    let results = []

    // we insert the first document separetely, and then all the other ones in parallel.
    // this i because if it's a new doctype,, the stack needs some time to create the collection and can't handle the other incoming requests
    allImports.push(cozyClient.data.create(docType, first)
      .then(result => {
        results.push(result)
        return Promise.all(docs.map(doc => cozyClient.data.create(docType, doc)))
      })
      .then(nextResults => {
        results = results.concat(nextResults)
        console.log('Imported ' + results.length + ' ' + docType + ' document' + (results.length > 1 ? 's' : ''))
        console.log(results.map(result => (result._id)))
        // console.log(results);
      })
      .catch(err => {
        console.log('Oops! An error occured.')
        if (err.name === 'FetchError' && err.status === 400) {
          console.warn(err.reason.error)
        } else if (err.name === 'FetchError' && err.status === 403) {
          console.warn('The server replied with 403 forbidden; are you sure the last generated token is still valid and has the correct permissions? You can generate a new one with the "-t" option.')
        } else if (err.name === 'FetchError' && err.status === 409) {
          console.warn('Document update conflict: ' + err.url)
        } else {
          console.warn(err)
        }
      }))
  }

  return Promise.all(allImports)
}

