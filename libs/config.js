/**
 * Sample config file to put in ~/.ACH.json

```
{
  "envs": {
    "dev": {
      "adminURL": "https://localhost:6062",
      "adminAuth": "USER:PASSWORD"
    },
    "int": {
      "adminURL": "https://localhost:6063",
      "adminAuth": "USER:PASSWORD"
    },
    "stg": {
      "adminURL": "https://localhost:6064",
      "adminAuth": "USER:PASSWORD"
    },
    "prod": {
      "adminURL": "https://localhost:6065",
      "adminAuth": "USER:PASSWORD"
    }
  }
}
```

 */

const fs = require('fs')

const config = JSON.parse(
  fs.readFileSync(`${process.env.HOME}/.ACH.json`).toString()
)

const domainToEnv = {
  'cozy.wtf': 'dev',
  'cozy.works': 'int',
  'cozy.rocks': 'stg',
  'mycozy.cloud': 'prod'
}

const getAdminConfigForDomain = domain => {
  const host = domain
    .split('.')
    .slice(1)
    .join('.')
  const env = domainToEnv[host]
  if (!env || !config.envs[env]) {
    throw new Error('Env not found: ' + host)
  }
  const envConfig = config.envs[env]
  return {
    adminAuth: envConfig.adminAuth,
    adminURL: envConfig.adminURL
  }
}

module.exports = {
  getAdminConfigForDomain
}
