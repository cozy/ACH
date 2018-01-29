/**
 * Some io.cozy.account are lacking their account_type attribute.
 * This script find the trigger associated to the account and
 * updates the `account_type` with the `konnector` value defined
 * in the trigger.
 */

const { queryAll } = require('../libs/utils')
const PromisePool = require('es6-promise-pool')
const jwtDecode = require('jwt-decode')

const DOCTYPE_COZY_ACCOUNTS = 'io.cozy.accounts'
const DOCTYPE_COZY_TRIGGERS = 'io.cozy.triggers'

let client

const decode = (val) => {
  try {
    return jwtDecode(val, { header: true })
  } catch (err) {
    // console.warn('Cannot decode ' + val)
    return
  }
}

const findTriggers = async (client) => {
  const index = await client.data.defineIndex(DOCTYPE_COZY_TRIGGERS, ['_id'])
  return client.data.query(index, { selector: { _id: { $gt: null }}})
}

/**
 * Some trigger have their data encoded as JWT in `.message.Data`,
 * some just have their data in `.message`.
 */
const triggerHasData = trigger => {
  return trigger.message && (trigger.message.Data || trigger.message.account)
}

/**
 * Returns "value" of the trigger. Decode only if the message has `.Data`
 */
const decodeTriggerDataIfNecessary = trigger => {
  if (trigger.message.Data) {
    return decode(trigger.message.Data)
  } else {
    return trigger.message
  }
}

const findKonnectorSlug = (triggers, account) => {
  const matchesAccount = decoded => decoded && decoded.account === account._id
  const matchingTriggerData = triggers
    .filter(triggerHasData)
    .map(decodeTriggerDataIfNecessary)
    .filter(matchesAccount)

  if (matchingTriggerData.length > 1) {
    throw new Error('More that 1 trigger matches the account')
  }
  if (matchingTriggerData.length === 0) {
    console.log('No matching konnector trigger for ' + account._id)
    return
  }
  return matchingTriggerData[0].konnector
}

const fixAccountsWithoutAccountType = async (client, dryRun = true) => {
  const index = await client.data.defineIndex(DOCTYPE_COZY_ACCOUNTS, ['_id'])
  const accounts = await client.data.query(index, { selector: { _id: { $gt: null } }})
  const triggers = (await findTriggers(client)).filter(x => x.worker === 'konnector')

  for (let account of accounts) {
    if (account.account_type) {
      console.log('Already has account_type, continue...')
      continue
    }
    const konnectorSlug = findKonnectorSlug(triggers, account)
    if (konnectorSlug) {
      account.account_type = konnectorSlug
      console.log('Found matching konnector for account ' + account._id + ' : ' + konnectorSlug)
      if (!dryRun) {
        client.data.update(DOCTYPE_COZY_ACCOUNTS, account, account)
      } else {
        console.info('✅  Would update ' + account._id + ' with account_type ' + konnectorSlug)
      }
    } else {
      console.log('❌  Could not find matching konnector for account ' + account._id)
      console.log(account)
    }
    console.log()
  }
}

module.exports = {
  getDoctypes: function () {
    return [
      DOCTYPE_COZY_ACCOUNTS,
      DOCTYPE_COZY_TRIGGERS
    ]
  },

  run: async function (ach, dryRun=true) {
    client = ach.client

    await (fixAccountsWithoutAccountType(client, dryRun)
      .catch(x => {
        console.log(x)
      })
    )
  },
  findTriggers,
  findKonnectorSlug,
  fixAccountsWithoutAccountType
}
