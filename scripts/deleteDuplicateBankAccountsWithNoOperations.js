const mkAPI = require('./api')
const groupBy = require('lodash/groupBy')
const flatten = require('lodash/flatten')
const log = require('../libs/log')

const DOCTYPE_BANK_ACCOUNTS = 'io.cozy.bank.accounts'
const DOCTYPE_BANK_TRANSACTIONS = 'io.cozy.bank.operations'

const findDuplicateAccounts = (accounts, operations) => {
  const duplicateAccountGroups = Object.entries(
    groupBy(accounts, x => x.institutionLabel + ' > ' + x.label)
  )
    .map(([, group]) => group)
    .filter(group => group.length > 1)

  return flatten(duplicateAccountGroups)
}

/** Returns a functions that filters out accounts with operations */
const hasNoOperations = operations => {
  const opsByAccountId = groupBy(operations, op => op.account)
  return account => {
    const accountOperations = opsByAccountId[account._id] || []
    log.info(
      `Account ${account._id} has ${accountOperations.length} operations`
    )
    return accountOperations.length === 0
  }
}

const run = async (api, dryRun) => {
  const accounts = await api.fetchAll(DOCTYPE_BANK_ACCOUNTS)
  const operations = await api.fetchAll(DOCTYPE_BANK_TRANSACTIONS)
  const duplicates = findDuplicateAccounts(
    accounts
  )
  const duplicatesWithoutOps = duplicates.filter(hasNoOperations(operations))

  const info = {
    nDuplicateAccounts: duplicates.length,
    deletedAccounts: duplicatesWithoutOps.map(x => ({
      label: x.label,
      _id: x._id
    }))
  }
  try {
    if (dryRun) {
      info.dryRun = true
    } else {
      if (duplicatesWithoutOps.length > 0) {
        api.deleteAll(DOCTYPE_BANK_ACCOUNTS, duplicatesWithoutOps)
      }
      info.success = true
    }
  } catch (e) {
    info.error = {
      message: e.message,
      stack: e.stack
    }
  }
  return info
}

module.exports = {
  getDoctypes: function() {
    return [DOCTYPE_BANK_ACCOUNTS, DOCTYPE_BANK_TRANSACTIONS]
  },
  findDuplicateAccounts,
  hasNoOperations,
  run: async function(ach, dryRun = true) {
    return run(mkAPI(ach.client), dryRun).catch(err => {
      return {
        error: {
          message: err.message,
          stack: err.stack
        }
      }
    })
  }
}
