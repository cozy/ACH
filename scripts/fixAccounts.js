/**
 * Due to legacy some io.cozy.account need a little cleaning.
 * This watch every account and update it if needed.
 */

const DOCTYPE_COZY_ACCOUNTS = 'io.cozy.accounts'

let client

const fixAccount = async (client, account, dryRun = true) => {
  const accountId = account._id
  console.log(
    `Account ${accountId}${account.account_type &&
      ` (${account.account_type})`}`
  )

  const sanitizedAccount = { ...account }
  let needUpdate = false

  // Check for outdated legacy attributes
  // dir_id is an old attribute which was still added on updates
  if (typeof account.dir_id === 'undefined') {
    console.log('✅  No attribute `dir_id`')
  } else if (dryRun) {
    console.info(`👌  Would remove \`dir_id\` from ${accountId}`)
  } else {
    console.info(`👌  Removing \`dir_id\` from ${accountId}`)
    delete sanitizedAccount.dir_id
    needUpdate = true
  }

  // folderId is a deprecated attribute. This information is now stored
  // directly in the trigger document
  if (typeof account.folderId === 'undefined') {
    console.log('✅  No attribute `folderId`')
  } else if (dryRun) {
    console.info(`👌  Would remove \`folderId\` from ${accountId}`)
  } else {
    console.info(`👌  Removing \`folderId\` from ${accountId}`)
    delete sanitizedAccount.folderId
    needUpdate = true
  }

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

    const segments = folderPath.split('/')
    if (segments[segments.length - 1] === sanitizedNamePath) {
      console.log('✅  `auth.folderPath` is consistent with `namePath`')
    } else {
      const sanitizedFolderPath = `${folderPath}${
        folderPath[folderPath.length - 1] === '/' ? '' : '/'
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

module.exports = {
  getDoctypes: function() {
    return [DOCTYPE_COZY_ACCOUNTS]
  },
  run: async function(ach, dryRun = true) {
    client = ach.client

    await fixAccounts(client, dryRun).catch(x => {
      console.log(x)
    })
  },
  fixAccount
}
