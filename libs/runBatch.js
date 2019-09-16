const PromisePool = require('es6-promise-pool')
const ACH = require('./ACH')
const log = require('./log')
const admin = require('./admin')
const config = require('./config')
const fs = require('fs')
const CozyClient = require('cozy-client').default

const namespacedLogger = namespace => ({
  log: console.log.bind(console, namespace),
  warn: console.warn.bind(console, namespace),
  info: console.info.bind(console, namespace),
  error: console.error.bind(console, namespace)
})

const runScript = async (script, domain, globalCtx) => {
  const doctypes = script.getDoctypes()
  const token =
    process.env.BATCH_TOKEN || (await admin.createToken(domain, doctypes))

  const protocol = domain === 'cozy.tools:8080' ? 'http' : 'https'
  const ach = new ACH(token, protocol + '://' + domain, doctypes)
  await ach.connect()
  const client = CozyClient.fromOldClient(ach.client)
  const logger = namespacedLogger(domain)
  const localCtx = {
    client,
    logger
  }
  return script.run({
    ...globalCtx,
    ...localCtx
  })
}

const runScriptPool = function*(script, domains, progress, globalCtx) {
  let i = 0

  for (const domain of domains) {
    const onResultOrError = (domain => (type, res) => {
      if (type == 'catch') {
        res = {
          error: {
            message: res.message,
            stack: res.stack
          }
        }
      }
      i++
      const data = { ...res, domain }
      if (globalCtx.verbose) {
        console.log(JSON.stringify(data))
      }
      progress(i, domains)
      return data
    })(domain)
    yield runScript(script, domain, globalCtx).then(
      onResultOrError.bind(null, 'then'),
      onResultOrError.bind(null, 'catch')
    )
  }
}

const progress = (i, arr) => {
  if (i % 50 === 0 || i == arr.length) {
    log.info(`Progress ${Math.round((i / arr.length) * 100, 2)}%`)
  }
}

/**
 * Reads a domain file into an Array
 *
 * Each domain is on 1 line
 * Empty lines ares removed
 */
const readDomainFile = filename => {
  return fs
    .readFileSync(filename)
    .toString()
    .split('\n')
    .filter(x => x != '')
}

const runBatch = async ({
  script,
  domains,
  domainsFile,
  limit = null,
  poolSize = 10,
  dryRun = true,
  fromDomain = null,
  verbose = true
}) => {
  await config.loadConfig()
  if (!domains && !domainsFile) {
    throw new Error(
      'runBatch: Invalid arguments. Need at least `domains` or `domainsFile`'
    )
  }
  domains = domains || readDomainFile(domainsFile)

  if (fromDomain) {
    const i = domains.findIndex(domain => domain === fromDomain)
    domains = domains.slice(i)
  }

  // An object that will be passed to functions run on each cozy
  // Can be used to store global stats
  const stats = {}

  const globalCtx = {
    stats,
    dryRun,
    verbose
  }

  const start = new Date()
  const pool = new PromisePool(
    runScriptPool(
      script,
      limit ? domains.slice(0, limit) : domains,
      progress,
      globalCtx
    ),
    poolSize
  )
  const results = []
  pool.addEventListener('fulfilled', function(event) {
    results.push(event.data.result)
  })
  await pool.start()
  const end = new Date()
  log.success(`Done in ${Math.round((end - start) / 1000, 2)}s`)
  return {
    results,
    stats
  }
}

module.exports = runBatch
