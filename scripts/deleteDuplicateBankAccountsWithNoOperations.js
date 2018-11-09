const mkAPI = require('./api')
const groupBy = require('lodash/groupBy')
const log = require('../libs/log')

const DOCTYPE_BANK_ACCOUNTS = 'io.cozy.bank.accounts'
const DOCTYPE_BANK_TRANSACTIONS = 'io.cozy.bank.operations'

const findDuplicateAccountsWithNoOperations = (accounts, operations) => {
  const opsByAccountId = groupBy(operations, op => op.account)

  const duplicateAccountGroups = Object.entries(
    groupBy(accounts, x => x.institutionLabel + ' > ' + x.label)
  )
    .map(([, group]) => group)
    .filter(group => group.length > 1)

  const res = []
  for (const duplicateAccounts of duplicateAccountGroups) {
    for (const account of duplicateAccounts) {
      const accountOperations = opsByAccountId[account._id] || []
      log.info(
        `Account ${account._id} has ${accountOperations.length} operations`
      )
      if (accountOperations.length === 0) {
        res.push(account)
      }
    }
  }
  return res
}

const run = async (api, dryRun) => {
  const accounts = await api.fetchAll(DOCTYPE_BANK_ACCOUNTS)
  const operations = await api.fetchAll(DOCTYPE_BANK_TRANSACTIONS)
  const accountsWithNoOperations = findDuplicateAccountsWithNoOperations(
    accounts,
    operations
  )
  const info = {
    deletedAccounts: accountsWithNoOperations.map(x => ({
      label: x.label,
      _id: x._id
    }))
  }
  try {
    if (dryRun) {
      info.dryRun = true
    } else {
      api.deleteAll(DOCTYPE_BANK_ACCOUNTS, accountsWithNoOperations)
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
  findDuplicateAccountsWithNoOperations,
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
