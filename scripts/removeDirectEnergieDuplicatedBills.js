const mkAPI = require('./api')
const fs = require('fs-extra')
const path = require('path')
const groupBy = require('lodash/groupBy')
const partition = require('lodash/partition')

const DOCTYPE_BILLS = 'io.cozy.bills'
const DOCTYPE_FILES = 'io.cozy.files'

// this source file comes from the execution of findDeduplicationOperations.js script in
// scrapers/conn-pool repo
// const DATASOURCE = path.join(__dirname, './data/int-instances.json')
// const DATASOURCE = path.join(__dirname, './data/stg-instances.json')
const DATASOURCE = path.join(__dirname, './data/prod-instances.json')

let client

module.exports = {
  getDoctypes: function() {
    return [DOCTYPE_BILLS, DOCTYPE_FILES]
  },
  run: async function(ach, dryRun) {
    const instance = ach.url.replace('https://', '')

    console.log('Instance ' + instance + '...')

    client = ach.client

    const { toKeep, toRemove } = await fetchBillsToUpdate(instance, client)

    console.log(`Will update ${toKeep.length} bills`)
    console.log(`Will delete ${toRemove.length} bills`)

    if (!dryRun) {
      client = ach.client
      const api = mkAPI(client)

      console.log('before update' + new Date())
      await api.updateAll(DOCTYPE_BILLS, toKeep)
      console.log('after update' + new Date())

      console.log('before delete' + new Date())
      await api.deleteAll(DOCTYPE_BILLS, toRemove)
      console.log('after delete' + new Date())
    }
  }
}

async function fetchBillsToUpdate(instance) {
  const instances = fs.readJsonSync(DATASOURCE)
  const account = instances.find(doc => doc.instance === instance)

  // get the list of files in the account
  let toKeep, toRemove
  if (
    account &&
    account.accountDoc &&
    account.accountDoc.auth &&
    account.accountDoc.auth.folderPath
  ) {
    try {
      const files = await client.files.statByPath(
        account.accountDoc.auth.folderPath
      )
      const fileIds = files.relationships.contents.data.map(doc => doc.id)

      const result = partition(
        account.bills,
        bill =>
          bill &&
          bill.invoice &&
          fileIds.includes(bill.invoice.split(':').pop())
      )
      toKeep = result[0]
      toRemove = result[1]
    } catch (err) {
      console.log(err.message, 'keeping all bills')
      toKeep = account.bills
      toRemove = []
    }
  } else {
    toKeep = account.bills
    toRemove = []
  }

  console.log(`Found ${toRemove.length} bills with files which do not exist`)

  console.log(`Now finding duplicates...`)
  const operations = findDuplicates(toKeep, {
    keys: ['date', 'amount']
  })

  operations.toKeep = operations.toKeep.map(doc => ({
    ...doc,
    vendor: 'Direct Energie',
    meta: {
      dateImport: new Date(),
      version: 2
    }
  }))

  operations.toRemove.push.apply(operations.toRemove, toRemove)

  return operations
}

function findDuplicates(documents, options) {
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
