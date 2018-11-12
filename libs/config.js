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

const loadConfig = configPath => {
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath).toString())
    } catch (e) {
      console.error(
        `Config file ${configPath} does not seem to be a valid JSON.`
      )
      throw new Error('Wrong config file')
    }
  } else {
    return {}
  }
}

const CONFIG_PATH = `${process.env.HOME}/.ACH.json`
const config = loadConfig(CONFIG_PATH)

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
