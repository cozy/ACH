const mkAPI = require('./api')
const log = require('cozy-logger').namespace('create-agg-account')

const ACCOUNT_DOCTYPE = 'io.cozy.accounts'
const KONNECTOR_DOCTYPE = 'io.cozy.konnectors'
const PERMISSION_DOCTYPE = 'io.cozy.permissions'

const AGGREGATOR_ACCOUNT_ID = 'bi-aggregator'
const BANKING_KONNECTOR_SLUGS = [
  'axabanque102',
  'banquepopulaire',
  'barclays136',
  'bforbank97',
  'bnpparibas82',
  'boursorama83',
  'bred',
  'caatlantica3',
  'caissedepargne1',
  'carrefour159',
  'casden173',
  'cdngroup109',
  'cdngroup88',
  'cic45',
  'cic63',
  'comptenickel168',
  'creditcooperatif148',
  'creditmaritime',
  'fortuneo84',
  'hellobank145',
  'hsbc119',
  'ingdirect95',
  'labanquepostale44',
  'lcl-linxo',
  'monabanq96',
  'societegenerale'
]

const utils = {}

utils.ensureAggregatorAccountExists = async (client, dryRun) => {
  let agg
  try {
    agg = await client.fetchJSON(
      'GET',
      `/data/${ACCOUNT_DOCTYPE}/${AGGREGATOR_ACCOUNT_ID}`
    )
    log('info', 'BI aggregator account already exists')
  } catch (e) {
    agg = null
  }
  if (agg) {
    return
  }
  log('debug', `Need to create ${ACCOUNT_DOCTYPE}:${AGGREGATOR_ACCOUNT_ID}...`)
  if (dryRun) {
    log(
      'debug',
      `Would have created ${ACCOUNT_DOCTYPE}:${AGGREGATOR_ACCOUNT_ID}...`
    )
  } else {
    return client.fetchJSON(
      'PUT',
      `/data/${ACCOUNT_DOCTYPE}/${AGGREGATOR_ACCOUNT_ID}`,
      {}
    )
  }
}

utils.fetchAllBankingKonnectors = async client => {
  const konnectors = await client.fetchJSON('GET', `/konnectors/`)
  return konnectors.filter(konn => {
    return BANKING_KONNECTOR_SLUGS.includes(konn.attributes.slug)
  })
}

const ensureKonnectorHasAggregatorPermissions = async (
  client,
  konn,
  dryRun
) => {
  log('debug', `Ensuring konnector has permission on aggregator account...`)
  const konnSlug = konn.attributes.slug
  if (dryRun) {
    log(
      'info',
      `Would have added permission on ${AGGREGATOR_ACCOUNT_ID} to ${konnSlug}`
    )
  } else {
    await client.fetchJSON('PATCH', `/permissions/konnectors/${konnSlug}`, {
      data: {
        type: 'io.cozy.permissions',
        attributes: {
          permissions: {
            aggregatorAccount: {
              type: ACCOUNT_DOCTYPE,
              verbs: ['GET', 'PUT'],
              values: [`${ACCOUNT_DOCTYPE}.${AGGREGATOR_ACCOUNT_ID}`]
            }
          }
        }
      }
    })
    log('info', `Added permission on ${AGGREGATOR_ACCOUNT_ID} to ${konnSlug}`)
  }
}

utils.ensureKonnectorsHaveAggregatorPermission = async (
  client,
  bankingKonnectors,
  dryRun
) => {
  log(
    'debug',
    `Banking konnectors: ${bankingKonnectors
      .map(konn => konn.attributes.slug)
      .join(', ')}`
  )
  for (const konn of bankingKonnectors) {
    await ensureKonnectorHasAggregatorPermissions(client, konn, dryRun)
  }
}

const ensureAccountHasRelationship = async (client, account, dryRun) => {
  if (account.relationships && account.relationships.parent) {
    return
  } else {
    log(
      'debug',
      `Adding "parent" relationship to ${AGGREGATOR_ACCOUNT_ID} to ${
        account._id
      }...`
    )
    if (dryRun) {
      log(
        'info',
        `Would have added "parent" relationship to ${AGGREGATOR_ACCOUNT_ID} to ${
          account._id
        }`
      )
    } else {
      await client.data.updateAttributes(ACCOUNT_DOCTYPE, account._id, {
        relationships: {
          ...(account.relationships || {}),
          parent: {
            data: {
              _id: AGGREGATOR_ACCOUNT_ID,
              _type: ACCOUNT_DOCTYPE
            }
          }
        }
      })
      log(
        'info',
        `Added "parent" relationship to ${AGGREGATOR_ACCOUNT_ID} to ${
          account._id
        }`
      )
    }
  }
}

const fetchAllBankingAccounts = async client => {
  const allAccounts = await client.fetchJSON(
    'GET',
    `/data/${ACCOUNT_DOCTYPE}/_normal_docs`
  )
  return allAccounts.rows.filter(account =>
    BANKING_KONNECTOR_SLUGS.includes(account.account_type)
  )
}

utils.ensureBankingAccountsHaveAggregatorRelationship = async (
  client,
  dryRun
) => {
  const accounts = await fetchAllBankingAccounts(client)
  for (let acc of accounts) {
    await ensureAccountHasRelationship(client, acc, dryRun)
  }
}

utils.run = async (api, client, dryRun) => {
  const bankingKonnectors = await utils.fetchAllBankingKonnectors(client)
  if (bankingKonnectors.length === 0) {
    log('info', 'No banking konnector, aborting...')
  } else {
    await utils.ensureAggregatorAccountExists(client, dryRun)
    await utils.ensureKonnectorsHaveAggregatorPermission(
      client,
      bankingKonnectors,
      dryRun
    )
    await utils.ensureBankingAccountsHaveAggregatorRelationship(client, dryRun)
  }
}

module.exports = {
  getDoctypes: function() {
    return [ACCOUNT_DOCTYPE, KONNECTOR_DOCTYPE, PERMISSION_DOCTYPE]
  },
  utils,
  log,
  run: async function(ach, dryRun = true) {
    return utils.run(mkAPI(ach.client), ach.client, dryRun).catch(err => {
      return {
        error: {
          message: err.message,
          stack: err.stack
        }
      }
    })
  }
}
