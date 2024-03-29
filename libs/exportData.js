const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const log = require('./log')
const { Q } = require('cozy-client')

// helpers
const stripMeta = function(obj) {
  const omitted = []
  if (process.env.ACH_NO_KEEP_ID) {
    omitted.push('_id')
  }
  if (!process.env.ACH_KEEP_REV) {
    omitted.push('_rev')
  }
  return _.omit(obj, omitted)
}

const fetchAll = async (cozyClient, doctype) => {
  try {
    let options = `include_docs=true`
    const result = await cozyClient.stackClient.fetchJSON(
      'GET',
      `/data/${doctype}/_all_docs?${options}`
    )
    return result.rows
      .filter(x => x.id.indexOf('_design') !== 0)
      .map(x => x.doc)
  } catch (e) {
    if (e.reason.reason == 'Database does not exist.') {
      return []
    }
    console.error(e)
    throw e
  }
}

const fetchRecent = async (cozyClient, doctype, last) => {
  try {
    const query = Q(doctype)
      .where({
        'cozyMetadata.updatedAt': {
          $gt: null
        }
      })
      .sortBy([{ 'cozyMetadata.updatedAt': 'desc' }])
      .limitBy(last)

    const result = await cozyClient.query(query)
    return result.data
  } catch (e) {
    console.error(e)
    throw e
  }
}

const fetchSingleDoc = async (cozyClient, doctype, id) => {
  try {
    const query = Q(doctype).getById(id)
    const result = await cozyClient.query(query)
    return result.data
  } catch (e) {
    console.error(e)
    throw e
  }
}

const exportToFile = async (data, filename) => {
  const json = JSON.stringify(data, null, 2)
  if (filename === '-' || !filename) {
    console.log(json)
  } else {
    fs.mkdirSync(path.dirname(filename), { recursive: true })
    return fs.promises.writeFile(filename, json)
  }
}

const exportSingleDoc = async (cozyClient, doctype, id, filename) => {
  log.debug('Exporting single doc...')

  const doc = await fetchSingleDoc(cozyClient, doctype, id)
  return exportToFile(doc, filename)
}

const exportDocs = async (cozyClient, doctypes, filename, last) => {
  log.debug('Exporting data...')

  const allExports = doctypes.map(async doctype => {
    try {
      const docs = last
        ? await fetchRecent(cozyClient, doctype, last)
        : await fetchAll(cozyClient, doctype)

      log.success('Exported documents for ' + doctype + ' : ' + docs.length)
      return docs
    } catch (err) {
      console.error(err)
    }
  })

  return Promise.all(allExports)
    .then(function(data) {
      return _(doctypes)
        .zip(_.map(data, documents => _.map(documents, stripMeta)))
        .fromPairs()
        .value()
    })
    .then(data => {
      return exportToFile(data, filename)
    })
}

module.exports = {
  exportDocs,
  exportSingleDoc
}
