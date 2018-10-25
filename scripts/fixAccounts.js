/**
 * Due to legacy some io.cozy.account need a little cleaning.
 * This watch every account and update it if needed.
 */
const { isEqual } = require('lodash')

const DOCTYPE_COZY_ACCOUNTS = 'io.cozy.accounts'
const DOCTYPE_COZY_FILES = 'io.cozy.files'
const DOCTYPE_COZY_TRIGGERS = 'io.cozy.triggers'

const findTriggerByAccount = async (client, accountId) => {
  const index = await client.data.defineIndex(DOCTYPE_COZY_TRIGGERS, [
    'message.account'
  ])
  const results = await client.data.query(index, {
    selector: {
      message: {
        account: {
          $eq: accountId
        }
      }
    }
  })
  return results[0]
}

const findFolder = async (client, folderId) => {
  return await client.files.statById(folderId)
}

// Check for outdated legacy attributes

// dir_id is an old attribute which was still added on updates
const fixAccountDirId = (account, dryRun = true) => {
  const sanitizedAccount = { ...account }
  if (typeof account.dir_id === 'undefined') {
    console.log('✅  No attribute `dir_id`')
  } else if (dryRun) {
    console.info(`👌  Would remove \`dir_id\` from ${account._id}`)
  } else {
    console.info(`👌  Removing \`dir_id\` from ${account._id}`)
    delete sanitizedAccount.dir_id
  }
  return sanitizedAccount
}

// folderId is a deprecated attribute. This information is now stored
// directly in the trigger document
const fixAccountFolderId = (account, dryRun = true) => {
  const sanitizedAccount = { ...account }
  if (typeof account.folderId === 'undefined') {
    console.log('✅  No attribute `folderId`')
  } else if (dryRun) {
    console.info(`👌  Would remove \`folderId\` from ${account._id}`)
  } else {
    console.info(`👌  Removing \`folderId\` from ${account._id}`)
    delete sanitizedAccount.folderId
  }
  return sanitizedAccount
}

const fixAccount = async (client, account, dryRun = true) => {
  const accountId = account._id
  console.log(
    `Account ${accountId}${account.account_type &&
      ` (${account.account_type})`}`
  )

  let sanitizedAccount = { ...account }
  let needUpdate = false

  sanitizedAccount = fixAccountDirId(sanitizedAccount, dryRun)
  sanitizedAccount = fixAccountFolderId(sanitizedAccount, dryRun)

  // Misplaced folderPath
  if (typeof account.folderPath === 'undefined') {
    console.log('✅  No attribute `folderPath` in account root')
  } else {
    if (!account.auth) {
      sanitizedAccount.auth = {}
    }
    if (!account.auth || typeof account.auth.folderPath === 'undefined') {
      if (dryRun) {
        console.info(
          `👌  Would move \`folderPath\` from ${accountId} to \`auth.folderPath\``
        )
      } else {
        console.info(
          `👌  Moving \`folderPath\` from ${accountId} to \`auth.folderPath\``
        )
        sanitizedAccount.auth.folderPath = sanitizedAccount.folderPath
        delete sanitizedAccount.folderPath
        needUpdate = true
      }
    } else {
      console.log(
        '❌  Conflict between `folderPath` and `auth.folderPath`, keeping `auth.folderPath`'
      )
      if (dryRun) {
        console.info(`👌  Would remove \`folderPath\` from ${accountId}`)
      } else {
        console.info(`👌  Removing \`folderPath\` from ${accountId}`)
        delete sanitizedAccount.folderPath
        needUpdate = true
      }
    }
  }

  // Consistency between auth.folderPath and auth.namePath
  // auth.folderPath must contains auth.namePath as last segment
  if (account.auth) {
    const {
      accountName,
      email,
      folderPath,
      identifier,
      login,
      namePath
    } = account.auth

    let actualFolderPath = folderPath

    if (!actualFolderPath) {
      // Get related trigger
      const trigger = await findTriggerByAccount(client, accountId)
      if (trigger) {
        if (trigger.message && trigger.message.folder_to_save) {
          // Get related folder
          const folder = await findFolder(
            client,
            trigger.message.folder_to_save
          )
          // folderPath
          if (folder) {
            console.log(
              `❌  Account ${accountId} does not contain \`auth.folderPath\` attribute`
            )

            actualFolderPath = folder.attributes.path
            if (dryRun) {
              console.info(
                `👌  Would update \`auth.folderPath\` to ${actualFolderPath} in ${accountId}`
              )
            } else {
              console.info(
                `👌  Updating \`auth.folderPath\` to ${actualFolderPath} in ${accountId}`
              )
              sanitizedAccount.auth.folderPath = actualFolderPath
              needUpdate = true
            }
          } else {
            console.log(
              `❌  Account ${accountId}'s trigger is not related to any existing folder\n\r`
            )
            return
          }
        } else {
          console.log(
            `✅  No attribute \`folderPath\` in account ${accountId} but related trigger ${
              trigger._id
            } does not contain \`message.folder_to_save\`\n\r`
          )
          return
        }
      } else {
        console.log(
          `❌  Account ${accountId} is not related to any trigger\n\r`
        )
        return
      }
    }

    let sanitizedNamePath = namePath

    if (!sanitizedNamePath) {
      sanitizedNamePath = accountName || login || identifier || email || ''

      sanitizedNamePath = sanitizedNamePath.replace(
        /[&/\\#,+()$@~%.'":*?<>{}]/g,
        '_'
      )

      if (dryRun) {
        console.info(
          `👌  Would create \`auth.namePath\` with value ${sanitizedNamePath}`
        )
      } else {
        console.info(
          `👌  Creating \`auth.namePath\` with value ${sanitizedNamePath}`
        )
        sanitizedAccount.auth.namePath = sanitizedNamePath
        needUpdate = true
      }
    }

    const segments = actualFolderPath.split('/')
    if (segments[segments.length - 1] === sanitizedNamePath) {
      console.log('✅  `auth.folderPath` is consistent with `namePath`')
    } else {
      const sanitizedFolderPath = `${actualFolderPath}${
        actualFolderPath[actualFolderPath.length - 1] === '/' ? '' : '/'
      }${sanitizedNamePath}`
      if (dryRun) {
        console.info(
          `👌  Would update \`auth.folderPath\` to ${sanitizedFolderPath} in ${accountId}`
        )
      } else {
        console.info(
          `👌  Updating \`auth.folderPath\` to ${sanitizedFolderPath} in ${accountId}`
        )
        sanitizedAccount.auth.folderPath = sanitizedFolderPath
        needUpdate = true
      }
    }
  } else {
    console.log(`❌  Account ${accountId} does not contain \`auth\` attribute`)
  }

  needUpdate = needUpdate || !isEqual(account, sanitizedAccount)

  if (needUpdate) {
    if (dryRun) {
      console.info(`👌  Would update ${accountId}`)
    } else {
      console.info(`👌  Updating ${accountId}`)
      await client.data.update(DOCTYPE_COZY_ACCOUNTS, account, sanitizedAccount)
    }
  }

  console.log()
}

const fixAccounts = async (client, dryRun = true) => {
  const index = await client.data.defineIndex(DOCTYPE_COZY_ACCOUNTS, ['_id'])
  const accounts = await client.data.query(index, {
    selector: { _id: { $gt: null } }
  })

  for (let account of accounts) {
    await fixAccount(client, account, dryRun)
  }
}

let client
module.exports = {
  getDoctypes: function() {
    return [DOCTYPE_COZY_ACCOUNTS, DOCTYPE_COZY_TRIGGERS, DOCTYPE_COZY_FILES]
  },
  run: async function(ach, dryRun = true) {
    client = ach.client

    await fixAccounts(client, dryRun).catch(x => {
      console.log(x)
    })
  },
  fixAccount
}
