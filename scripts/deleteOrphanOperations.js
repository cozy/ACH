const keyBy = require('lodash/keyBy')

const DOCTYPE_BANK_OPERATIONS = 'io.cozy.bank.operations'
const DOCTYPE_BANK_ACCOUNTS = 'io.cozy.bank.accounts'

let client

const flagForDeletion = doc => {
  return {...doc, _deleted: true}
}

const api = {
  fetchAll: async (doctype, queryOptions = '') => {
    const result = await client.fetchJSON('GET', `/data/${doctype}/_all_docs?${queryOptions}`)
    return result.rows
  },

  deleteAll: async (doctype, docs) => {
    return client.fetchJSON(
      'POST', `/data/${doctype}/_bulk_docs`,
      { docs: docs.map(flagForDeletion) }
    )
  }
}

const deleteOrphanBankOperations = async dryRun => {
  const accounts = keyBy(await api.fetchAll(DOCTYPE_BANK_ACCOUNTS), 'id')
  const operations = (await api.fetchAll(DOCTYPE_BANK_OPERATIONS, 'include_docs=true'))
    .map(x => x.doc)
    .filter(x => x._id.indexOf('_design') !== 0)
  const orphanOperations = operations.filter(x => !accounts[x.account])
  console.log('Total number of operations', operations.length)
  console.log('Total number of orphan operations', orphanOperations.length)
  if (dryRun) {
    console.log('Dry run, not deleting')
  } else {
    console.log(`Deleting ${orphanOperations.length} orphan operations...`)
    return api.deleteAll('io.cozy.bank.operations', orphanOperations)
  }
}

module.exports = {
  api: api,
  getDoctypes: function () {
    return [
      DOCTYPE_BANK_OPERATIONS,
      DOCTYPE_BANK_ACCOUNTS
    ]
  },

  run: async function (ach, dryRun=true) {
    client = ach.client
    try {
      await deleteOrphanBankOperations(dryRun)
    } catch (err) {
      console.log(err)
    }
  }
}
