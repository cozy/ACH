const PromisePool = require('es6-promise-pool')
const ACH = require('./ACH')
const log = require('./log')
const admin = require('./admin')
const fs = require('fs')

const runScript = async (script, domain, dryRun) => {
  const doctypes = script.getDoctypes()
  const token = await admin.createToken(domain, doctypes)
  const ach = new ACH(token, 'https://' + domain, doctypes)
  await ach.connect()
  return script.run(ach, dryRun)
}

const runScriptPool = function*(script, domains, progress, dryRun) {
  let i = 0

  for (const domain of domains) {
    const onResultOrError = res => {
      if (res instanceof Error) {
        res = { message: res.message, stack: res.stack }
      }
      i++
      console.log(JSON.stringify({ ...res, domain }))
      progress(i, domains)
    }
    yield runScript(script, domain, dryRun).then(
      onResultOrError,
      onResultOrError
    )
  }
}

const progress = (i, arr) => {
  if (i % 50 === 0 || i == arr.length) {
    log.info(`Progress ${Math.round((i / arr.length) * 100, 2)}%`)
  }
}

const runBatch = async (script, domainsFile, limit, dryRun) => {
  const domains = fs
    .readFileSync(domainsFile)
    .toString()
    .split('\n')
    .filter(x => x != '')

  const start = new Date()
  const pool = new PromisePool(
    runScriptPool(
      script,
      limit ? domains.slice(0, limit) : domains,
      progress,
      dryRun
    ),
    30
  )
  await pool.start()
  const end = new Date()
  log.success(`Done in ${Math.round((end - start) / 1000, 2)}s`)
}

module.exports = runBatch
