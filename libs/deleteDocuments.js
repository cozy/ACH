const { Q } = require('cozy-client')

const log = require('./log')

const deleteDocument = async (client, file) => {
  try {
    await client.destroy(file)
    log.info(`Deleted: ${file._id}`)
  } catch (error) {
    log.warn(`Error deleting file ${file._id} : ${error}`)
  }
}

// drop documents of the given doctype, ids
module.exports = async (client, doctype, ids) => {
  const { data: files } = await client.query(Q(doctype).getByIds(ids))
  if (files.length === 0) {
    log.info(`No documents with provided ids of type ${doctype} found`)
    return
  }
  const promises = files.map(file => deleteDocument(client, file))
  return Promise.allSettled(promises)
}
