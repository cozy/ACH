const groupBy = require('lodash/groupBy')
const log = require('../libs/log')
const { Document, BankAccount, BankTransaction } = require('cozy-doctypes')

const run = async dryRun => {
  const accounts = await BankAccount.fetchAll()
  const operations = await BankTransaction.fetchAll()
  const accountsWithNoOperations = BankAccount.findDuplicateAccountsWithNoOperations(
    accounts,
    operations
  )
  const info = {
    deletedAccounts: accountsWithNoOperations.map(x => (
      { label: x.label, _id: x._id, shortLabel: x.shortLabel }
    ))
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
