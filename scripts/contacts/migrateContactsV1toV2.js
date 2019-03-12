const has = require('lodash/has')
const isEmpty = require('lodash/isEmpty')
const omit = require('lodash/omit')

const mkAPI = require('../api')
const {
  migrationDiff: diff,
  getWithInstanceLogger
} = require('../../libs/utils')

const CONTACTS_APP_NAME = 'Contacts'
const KONNECTOR_APP_NAME = 'konnector-google'
const ACCOUNT_APP_VERSION = 1
const DOCTYPE_CONTACTS = 'io.cozy.contacts'
const DOCTYPE_ACCOUNTS = 'io.cozy.accounts'
const DOCTYPE_CONTACTS_ACCOUNT = 'io.cozy.contacts.accounts'
const DOCTYPE_CONTACTS_VERSION = 2

const getCreatedByApp = contact => {
  const metadataKeys = Object.keys(contact.metadata || {}).filter(
    k => k !== 'version'
  )

  if (metadataKeys.includes('google')) {
    return KONNECTOR_APP_NAME
  } else {
    return CONTACTS_APP_NAME
  }
}

const filterContact = contact => {
  const filteredContact = omit(
    contact,
    'vendorId',
    'metadata.cozy',
    'metadata.version'
  )
  if (isEmpty(filteredContact.metadata)) {
    filteredContact.metadata = undefined
  }

  return filteredContact
}

const migrateContactV1toV2 = (contact, accountId, contactAccountId) => {
  const now = new Date().toISOString()
  const createdByApp = getCreatedByApp(contact)
  let accounts = []
  let sourceAccount, sync
  if (contactAccountId && createdByApp === KONNECTOR_APP_NAME) {
    sync = {
      [contactAccountId]: {
        contactsAccountsId: contactAccountId,
        id: contact.vendorId,
        konnector: KONNECTOR_APP_NAME,
        lastSync: now,
        remoteRev: undefined
      }
    }
    sourceAccount = accountId
    accounts = [
      {
        _id: contactAccountId,
        _type: DOCTYPE_CONTACTS_ACCOUNT
      }
    ]
  }

  return {
    ...filterContact(contact),
    me: false,
    cozyMetadata: {
      sync,
      createdAt: undefined,
      createdByApp,
      createdByAppVersion: undefined,
      doctypeVersion: DOCTYPE_CONTACTS_VERSION,
      sourceAccount,
      updatedAt: now,
      updatedByApps: [
        {
          date: now,
          slug: createdByApp,
          version: undefined
        }
      ]
    },
    relationships: {
      ...contact.relationships,
      accounts: {
        data: accounts
      }
    }
  }
}

const createContactAccount = (account, accountName) => ({
  canLinkContacts: true,
  shouldSyncOrphan: true,
  lastSync: null,
  lastLocalSync: null,
  name: accountName,
  type: KONNECTOR_APP_NAME,
  sourceAccount: account._id,
  version: ACCOUNT_APP_VERSION
})

const getAccountName = contacts => {
  const contactWithFrom = contacts.find(contact =>
    has(contact, 'metadata.google.from')
  )
  return contactWithFrom ? contactWithFrom.metadata.google.from : ''
}

async function doMigrations(dryRun, api, logWithInstance) {
  const accounts = await api.fetchAll(DOCTYPE_ACCOUNTS)
  const contacts = await api.fetchAll(DOCTYPE_CONTACTS)
  const konnectorAccount = accounts.find(doc => doc.account_type === 'google')
  const accountName = getAccountName(contacts)

  let accountId, contactAccountId
  if (dryRun) {
    accountId = 'dryRunAccountId'
    contactAccountId = 'dryRunContactAccountId'
    const contactAccount = createContactAccount({ _id: accountId }, accountName)
    logWithInstance('Dry run: would create contact account', contactAccount)
  } else if (konnectorAccount) {
    const contactAccount = createContactAccount(konnectorAccount, accountName)
    const response = await api.update(DOCTYPE_CONTACTS_ACCOUNT, contactAccount)
    accountId = konnectorAccount._id
    contactAccountId = response.id
  }

  const updatedContacts = contacts.map(contact =>
    migrateContactV1toV2(contact, accountId, contactAccountId)
  )

  if (!dryRun) {
    await api.updateAll(DOCTYPE_CONTACTS, updatedContacts)
  } else {
    logWithInstance(
      'Dry run: first updated contact\n',
      diff(contacts[0], updatedContacts[0])
    )
  }

  logWithInstance(
    dryRun ? 'Would create' : 'Has created',
    1,
    DOCTYPE_CONTACTS_ACCOUNT
  )

  logWithInstance(
    dryRun ? 'Would update' : 'Has updated',
    contacts.length,
    DOCTYPE_CONTACTS
  )
}

module.exports = {
  getDoctypes: function() {
    return [DOCTYPE_ACCOUNTS, DOCTYPE_CONTACTS, DOCTYPE_CONTACTS_ACCOUNT]
  },

  run: async function(ach, dryRun = true) {
    const api = mkAPI(ach.client)
    const logWithInstance = getWithInstanceLogger(ach.client)
    try {
      await doMigrations(dryRun, api, logWithInstance)
    } catch (err) {
      console.log(ach.url, err)
    }
  }
}
