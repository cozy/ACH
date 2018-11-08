const keyBy = require('lodash/keyBy')
const groupBy = require('lodash/groupBy')
const log = require('../libs/log')
const { Document, BankAccount, BankTransaction } = require('cozy-doctypes')

const findDuplicateAccountsWithNoOperations = (accounts, operations) => {
  const opsByAccountId = groupBy(operations, op => op.account)

  const duplicateAccountGroups = Object.entries(groupBy(accounts, x => x.label))
    .map(([, duplicateGroup]) => duplicateGroup)
    .filter(duplicateGroup => duplicateGroup.length > 1)

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

const run = async (dryRun) => {
  const accounts = await BankAccount.fetchAll()
  const operations = await BankTransaction.fetchAll()
  const accountsWithNoOperations = findDuplicateAccountsWithNoOperations(
    accounts,
    operations
  )
  const deletedAccountIds = accountsWithNoOperations.map(x => x._id)
  const info = {
    deletedAccountIds
  }
  try {
    if (dryRun) {
      info.dryRun = true
    } else {
      await BankAccount.deleteAll(accountsWithNoOperations)
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
    return [BankAccount.doctype, BankTransaction.doctype]
  },
  findDuplicateAccountsWithNoOperations,
  run: async function(ach, dryRun = true) {
    Document.registerClient(ach.client)
    return run(dryRun).catch(err => {
      return {
        error: {
          message: err.message,
          stack: err.stack
        }
      }
    })
  }
}
