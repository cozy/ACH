const cozy = require('cozy-client-js')
const dirTree = require('directory-tree')
const path = require('path')
const fs = require('fs')

// function to upload File (json format)
const uploadFile = module.exports.uploadFile = (client, FileJSON, dirID, fileID) => {
  const readStream = fs.createReadStream(FileJSON.path)
  // must specify  the content-type here
  let contentType = ''
  switch (FileJSON.extension) {
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.png':
    case '.tiff':
      contentType = `image/${FileJSON.extension.substring(1)}`
      break
    case '.pdf':
      contentType = `application/pdf`
      break
    default:
      contentType = ''
      break
  }
  return client.files.create(readStream, {
    name: FileJSON.name,
    contentType,
    dirID: dirID || '',
    _id: fileID
  })
}

// function to upload a folder content (json format)
const uploadFolderContent = module.exports.uploadFolderContent = (client, FolderContentJSON, dirID) => {
  return client.files.createDirectory({
    name: FolderContentJSON.name,
    dirID: dirID || ''
  }).then(folderDoc => {
    console.log(`  _id: ${folderDoc._id}, folder.path: ${folderDoc.attributes.path}`)
    if (FolderContentJSON.children) {
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
    }
  })
  .catch(err => {
    return Promise.resolve(err)
  })
}

module.exports.queryAll = function (cozyClient, mangoIndex, options) {
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
