const tz = require('timezone')
const eu = tz(require('timezone/Europe'))
const jdiff = require('jest-diff')
const mkAPI = require('./api')
const groupBy = require('lodash/groupBy')

const DOCTYPE_BANK_TRANSACTIONS = 'io.cozy.bank.operations'
const DOCTYPE_BANK_ACCOUNTS = 'io.cozy.bank.accounts'
const DOCTYPE_BANK_SETTINGS = 'io.cozy.bank.settings'

const run = async (client, api, dryRun) => {
  const accounts = await api.fetchAll(DOCTYPE_BANK_ACCOUNTS)
  const duplicates = Object.entries(groupBy(accounts, x => x.label))
    .filter(([label, group]) => group.length > 1)
  const info = {
    duplicates
  }
  return info
}

module.exports = {
  getDoctypes: function() {
    return [
      DOCTYPE_BANK_ACCOUNTS
    ]
  },

  run: async function(ach, dryRun = true) {
    return run(ach.client, mkAPI(ach.client), dryRun)
      .catch(err => {
        return {
          error: {
            message: err.message,
            stack: err.stack
          } 
        }
      })
  }
}
