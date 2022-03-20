const fs = require('fs')

const { models } = require('cozy-client')
const { uploadFileWithConflictStrategy } = models.file

const { getAllDocuments } = require('./prepareDocuments')

const DOCTYPE_FILES = 'io.cozy.files'
const ROOT_ID = 'io.cozy.files.root-dir'

const NUMBER_OF_DOCS = 3

const createDocuments = () => {
  const documents = []

  for (let idx = 0; idx < NUMBER_OF_DOCS; idx++) {
    for (const doc of getAllDocuments()) {
      const data = fs.createReadStream(doc.filePath)
      documents.push({
        data,
        name: doc.filename,
        metadata: doc.metadata
      })
    }
  }

  return documents
}

module.exports = {
  createDocuments,
  getDoctypes: function() {
    return [DOCTYPE_FILES]
  },
  run: async function(ach) {
    const client = ach.client
    const documents = createDocuments()

    console.log(`Import ${documents.length} documents...`)

    // TODO Créer un dossier à la racine de Drive?

    for (const { data, name, metadata } of documents) {
      await uploadFileWithConflictStrategy(client, data, {
        name: `${name}.pdf`,
        contentType: 'application/pdf',
        metadata,
        dirId: ROOT_ID,
        conflictStrategy: 'rename'
      })
    }

    console.log('Done!')
  }
}
