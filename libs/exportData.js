const _ = require('lodash')
const fs = require('fs')
const { queryAll } = require('./utils')
const log = require('./log')

// helpers
const stripMeta = function (obj) {
  const omitted = []
  if (!process.env.ACH_KEEP_ID) { omitted.push('_id') }
  if (!process.env.ACH_KEEP_REV) { omitted.push('_rev') }
  return _.omit(obj, omitted)
}

const promiscify = function (fn) {
  return function () {
    const args = Array.from(arguments)
    const that = this
    return new Promise((resolve, reject) => {
      const callback = function (err, res) {
        if (err) reject(err)
        else resolve(res)
      }
      args.push(callback)
      fn.apply(that, args)
    })
  }
}

const writeFilePromise = promiscify(fs.writeFile)

module.exports = (cozyClient, doctypes, filename) => {
  log.debug('Exporting data...')

  const allExports = doctypes.map(doctype => {
    return cozyClient.data.defineIndex(doctype, ['_id'])
      .then(mangoIndex => {
        return queryAll(cozyClient, mangoIndex, {
          selector: {'_id': {'$gt': null}},
          descending: true
        })
      }).then(docs => {
        log.success('Exported documents for ' + doctype + ' : ' + docs.length)
        return docs
      })
  })

  return Promise.all(allExports)
    .then(function (data) {
      return _(doctypes)
        .zip(_.map(data, documents => _.map(documents, stripMeta)))
        .fromPairs()
        .value()
    })
    .then(data => {
      const json = JSON.stringify(data, null, 2)
      if (filename === '-') {
        console.log(json)
      } else {
        return writeFilePromise(filename, json)
      }
    })
    .catch(function (err) {
      log.error(err)
    })
}
