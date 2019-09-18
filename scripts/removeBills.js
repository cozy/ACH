const mkAPI = require('./api')

const DOCTYPE_BILLS = 'io.cozy.bills'
const get = require('lodash/get')

// define your bills filter here
// I am sure there is a better wait to configure that in ACH
//
function billsToRemoveFilter(bill) {
  // return bill.vendor === 'impot'
  // return get(bills.cozyMetadata.createdByApp) === 'impot' && get(bills.cozyMetadata.createdByAppVersion === "1.9.0")
  return false
}

const run = async (api, dryRun) => {
  const bills = await api.fetchAll(DOCTYPE_BILLS)
  // console.warn(JSON.stringify(bills, null, 4))
  const billsToRemove = bills.filter(billsToRemoveFilter)

  console.log(JSON.stringify(billsToRemove, null, 4))
  console.log(`${billsToRemove.length}/${bills.length} bills to remove`)
  if (!dryRun && billsToRemove.length) {
    console.log('Deleting bills...')
    await api.deleteAll(DOCTYPE_BILLS, billsToRemove)
    console.log('  done')
  }
}

module.exports = {
  getDoctypes: () => [DOCTYPE_BILLS],
  run: async function(ach, dryRun = true) {
    return run(mkAPI(ach.client), dryRun).catch(err => {
      console.error(err)
      return {
        error: {
          message: err.message,
          stack: err.stack
        }
      }
    })
  }
}
