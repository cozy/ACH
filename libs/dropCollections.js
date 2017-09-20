const { queryAll } = require('./utils')

const dropCollection = (client, docType) => {
  return client.data.defineIndex(docType, ['_id'])
    .then(index => {
      // now let's fetch all the data
      return queryAll(client, index, {
        selector: {'_id': {'$gt': null}},
        fields: ['_id', '_rev']
      })
    })
    .then(docs => {
      // well now we drop them all...
      return Promise.all(docs.map(doc => client.data.delete(docType, doc)))
    })
    .then(results => {
      console.log('Deleted ' + results.filter(result => (result.deleted)).length + '/' + results.length + ' documents.')
      return results
    })
}

// drop all documents of the given doctype
module.exports = (client, docTypes) => {
  const promises = docTypes.map(doctype => dropCollection(client, doctype))
  return Promise.all(promises)
}
