const doNotThrowOn404 = function (method, that) {
  return function () {
    return method.apply(this, arguments).catch(err => {
      if (err && err.response && err.response.status === 404) {
        return false
      }
      throw err
    })
  }
}

const forceCreateDoc = function (client, doctype, data) {
  const create = () => {
    return client.data.create(doctype, data)
  }
  if (data._id) {
    return client.data.existsById(doctype, data._id).then(exists => {
      return exists ? client.data.delete(doctype, exists) : true
    }).then(() => {
      return create()
    })
  } else {
    return create()
  }
}

const forceCreateFileByPath = function (client, path, data, options) {
  return client.files.existsByPath(path).then(function (stat) {
    if (!stat) {
      return client.files.create(data, options)
    } else {
      return client.files.updateById(stat._id, data, options)
    }
  })
}

const addUtilityMethods = function (client) {
  client.files.existsByPath = doNotThrowOn404(client.files.statByPath)
  client.files.existsById = doNotThrowOn404(client.files.statById)
  client.data.existsById = doNotThrowOn404(client.data.find)
  client.data.forceCreate = forceCreateDoc.bind(null, client)
  client.files.forceCreateByPath = forceCreateFileByPath.bind(null, client)
}

module.exports = { addUtilityMethods }