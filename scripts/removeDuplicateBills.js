/* eslint no-console: off */

const mkAPI = require('./api')
const groupBy = require('lodash/groupBy')
const partition = require('lodash/partition')
const keyBy = require('lodash/keyBy')
const sortBy = require('lodash/sortBy')

const DOCTYPE_BILLS = 'io.cozy.bills'
const DOCTYPE_FILES = 'io.cozy.files'
const DOCTYPE_ACCOUNTS = 'io.cozy.accounts'
const DOCTYPE_OPERATIONS = 'io.cozy.bank.operations'

const MORE_LOGS = false

let client
let api

module.exports = {
  getDoctypes: function() {
    return [DOCTYPE_BILLS, DOCTYPE_FILES, DOCTYPE_ACCOUNTS, DOCTYPE_OPERATIONS]
  },
  run: async function(ach, dryRun, argv) {
    const [vendor] = argv
    if (vendor == null) {
      console.log(`wrong arguments : ${argv}`)
      process.exit()
    }

    const instance = ach.url.replace('https://', '')

    console.log('Instance ' + instance + '...')

    client = ach.client
    api = mkAPI(client)

    const fileIds = (await api.fetchAll(DOCTYPE_FILES)).map(doc => doc._id)

    let bills = await api.fetchAll(DOCTYPE_BILLS)
    if (vendor) bills = bills.filter(bill => bill.vendor === vendor)

    const operations = await api.fetchAll(DOCTYPE_OPERATIONS)

    // find bills related to not existing files
    let toKeep, toRemove

    if (fileIds.length === 0) {
      console.log('no account with directory: keeping all bills')
      toKeep = bills
      toRemove = []
    } else {
      try {
        const result = partition(
          bills,
          bill =>
            bill &&
            bill.invoice &&
            fileIds.includes(bill.invoice.split(':').pop())
        )
        toKeep = result[0]
        toRemove = result[1]
      } catch (err) {
        console.log(err.message, 'keeping all bills')
        toKeep = bills
        toRemove = []
      }
    }

    console.log(`Found ${toRemove.length} bills with files which do not exist`)
    console.log(`Now finding duplicates...`)
    const todo = await findDuplicates(toKeep, operations, {
      keys: ['date', 'amount', 'vendor']
    })

    todo.toRemove.push.apply(todo.toRemove, toRemove)

    // update and delete if not dryRun
    console.log(
      `Will delete ${todo.toRemove.length} bills / ${bills.length} total`
    )

    removeBillsFromOperations(todo.toRemove, operations, dryRun, instance)

    if (!dryRun) {
      if (todo.toRemove.length) {
        log('Removing duplicates')
        await api.deleteAll(DOCTYPE_BILLS, todo.toRemove)
      }
    }
  }
}

const findDuplicates = async (bills, operations, options) => {
  let hash = null
  if (options.keys) {
    hash = doc =>
      options.keys
        .map(key => {
          let result = doc[key]
          if (key === 'date') result = new Date(result)
          return result
        })
        .join(',')
  } else if (options.hash) {
    hash = options.hash
  } else {
    throw new Error('findDuplicates: you must specify keys or hash option')
  }

  // keep the bills with the highest number of operations linked to it
  let documents = sortBillsByLinkedOperationNumber(bills, operations)

  const groups = groupBy(documents, hash)
  const toKeep = []
  const toRemove = []
  for (let key in groups) {
    const group = groups[key]
    toKeep.push(group[0])
    toRemove.push.apply(
      toRemove,
      group.slice(1).map(doc => ({
        ...doc,
        original: group[0]._id
      }))
    )
  }

  return { toKeep, toRemove }
}

const sortBillsByLinkedOperationNumber = (bills, operations) => {
  bills = bills.map(bill => {
    bill.opNb = 0
    return bill
  })
  const billsIndex = keyBy(bills, '_id')
  if (operations)
    operations.forEach(op => {
      if (op.bills)
        op.bills.forEach(billId => {
          const bill = billsIndex[billId]
          if (bill) bill.opNb++
        })
    })
  const sorted = sortBy(Object.values(billsIndex), 'opNb').reverse()
  return sorted
}

async function removeBillsFromOperations(bills, operations, dryRun, instance) {
  console.log(`Removing ${bills.length} bills from bank operations`)
  const ops = operations.filter(op => op.bills || op.reimbursements)
  const batchTodo = []
  for (let op of ops) {
    log(`op: ${op._id}`, true)
    let needUpdate = false
    let billsAttribute = op.bills ? cloneObj(op.bills) : []
    let reimbAttribute = op.reimbursements ? cloneObj(op.reimbursements) : []
    for (let bill of bills) {
      const billLongId = `io.cozy.bills:${bill._id}`
      // if bill id found in op bills, do something
      if (billsAttribute.indexOf(billLongId) >= 0) {
        log(`  found bill to remove: ${bill._id}`, true)
        needUpdate = true
        billsAttribute = billsAttribute.filter(
          billId =>
            billId !== billLongId && billId !== `io.cozy.bills:${bill.original}`
        )
        if (bill.original) {
          log(`  with original bill: ${bill.original}`, true)
          billsAttribute.push(`io.cozy.bills:${bill.original}`)
        }
      }
      const foundReimb = reimbAttribute.filter(doc => doc.billId === billLongId)
      const foundOriginal = reimbAttribute.filter(
        doc => doc.billId === `io.cozy.bills:${bill.original}`
      )

      if (foundReimb.length) {
        log(
          `  found reimbursement to remove: ${JSON.stringify(
            foundReimb,
            null,
            2
          )}`,
          true
        )
        needUpdate = true
      }
      if (foundReimb.length && foundOriginal.length) {
        // remove reimbursement
        log(`  original is already here just removing the bill`, true)
        reimbAttribute = reimbAttribute.filter(doc => doc.billId !== billLongId)
      } else if (foundReimb.length && !foundOriginal.length) {
        log(`  replacing with original`, true)
        // replace reimbursement billId by originall billId
        reimbAttribute = reimbAttribute.map(doc => {
          if (doc.billId === billLongId) {
            doc.billId = `io.cozy.bills:${bill.original}`
          }
          return doc
        })
      }
    }
    if (needUpdate) {
      // favor bills in reimbursements over bills in bills attribute
      if (billsAttribute && billsAttribute.length) {
        log(`before: ${JSON.stringify(billsAttribute, null, 2)}`, true)
        const reimbBillIds = reimbAttribute
          ? reimbAttribute.map(doc => doc.billId)
          : []
        log(`reimbBillIds: ${JSON.stringify(reimbBillIds, null, 2)}`, true)
        billsAttribute = billsAttribute
          ? billsAttribute.filter(bill => !reimbBillIds.includes(bill))
          : []
        log(`after: ${JSON.stringify(billsAttribute, null, 2)}`, true)
      }

      log(
        `Bank operation ${op._id}: Replacing ${JSON.stringify(
          {
            bills: op.bills,
            reimbursements: op.reimbursements
          },
          null,
          2
        )}
        with ${JSON.stringify(
          {
            bills: billsAttribute,
            reimbursements: reimbAttribute
          },
          null,
          2
        )}`,
        true
      )
      batchTodo.push({
        ...op,
        bills: billsAttribute,
        reimbursements: reimbAttribute
      })
    }
  }

  log(
    `Will update ${batchTodo.length} operations / ${
      operations.length
    } on ${instance}`
  )

  if (!dryRun) {
    log('Updating operations')
    await api.updateAll(DOCTYPE_OPERATIONS, batchTodo)
  }
}

function cloneObj(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function log(str, is_more) {
  if (!is_more || MORE_LOGS) console.log(str)
}
