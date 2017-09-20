const path = require('path')
const fs = require('fs')

const getContentTypeFromExtension = function (extension) {
  let contentType = ''
  switch (extension) {
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.png':
    case '.tiff':
      contentType = `image/${extension.substring(1)}`
      break
    case '.pdf':
      contentType = `application/pdf`
      break
    default:
      contentType = ''
      break
  }
  return contentType
}

/**
 * Upload a file from a fileJSON description. Keeps the same name
 * as the fileJSON. Will overwrite existing file.
 *
 * @param  {[type]} client   - Cozy client
 * @param  {[type]} fileJSON - FileJSON describing the file
 * @param  {String} dirID    - Where to put the file
 * @return {[type]}          - Promise
 */
const uploadFile = module.exports.uploadFile = (client, fileJSON, dirID = '', force) => {
  const data = fs.createReadStream(fileJSON.path)
  const contentType = getContentTypeFromExtension(fileJSON.extension)
  const dirProm = dirID === '' ? client.files.statByPath('/') : client.files.statById(dirID)
  return dirProm.then(doc => {
    const path = doc.attributes.path
    return client.files.forceCreateByPath(`${path}/${fileJSON.name}`, data, {
      name: fileJSON.name,
      contentType,
      dirID: dirID
    })
  })
}

// function to upload a folder content (json format)
const uploadFolderContent = module.exports.uploadFolderContent = (client, FolderContentJSON, dirID) => {
  return client.files.createDirectory({
    name: FolderContentJSON.name,
    dirID: dirID || ''
  }).then(folderDoc => {
    console.log(`  _id: ${folderDoc._id}, folder.path: ${folderDoc.attributes.path}`)
    if (!FolderContentJSON.children) {
      return
    }
    return Promise.all(FolderContentJSON.children.map((child) => {
      if (child.children) { // it's a folder, use recursivity
        return uploadFolderContent(client, child, folderDoc._id)
      } else { // it's a file
        return uploadFile(client, child, folderDoc._id)
          .then(fileDoc => {
            console.log(`  _id: ${fileDoc._id},  file.path: ${folderDoc.attributes.path}/${fileDoc.attributes.name}`)
            return fileDoc
          })
      }
    }))
  })
  .catch(err => {
    return Promise.resolve(err)
  })
}

module.exports.queryAll = function (cozyClient, mangoIndex, options = {}) {
  return new Promise((resolve, reject) => {
    const documents = []
    var skip = options.skip || 0
    var fetch = function () {
      return cozyClient.data.query(
          mangoIndex, Object.assign({}, options, {
            wholeResponse: true,
            skip: skip
          }))
        .then(onSuccess)
         .catch(reject)
    }
    var onSuccess = function (response) {
      const docs = response.docs
      skip = skip + docs.length
      documents.push.apply(documents, docs)
      if (response.next) {
        fetch()
      } else {
        resolve(documents)
      }
    }
    fetch()
  })
}
