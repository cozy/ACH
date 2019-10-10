jest.mock('node-fetch')
jest.mock('./config', () => ({
  loadConfig: jest.fn(),
  getAdminConfigForEnv: env => {
    if (env === 'prod') {
      return {
        adminURL: 'http://localhost:6065',
        host: 'gozy-adm-prod'
      }
    } else if (env === 'dev') {
      return {
        adminURL: 'http://localhost:6061',
        host: 'gozy-adm-dev'
      }
    } else {
      throw new Error(`Unknown env ${JSON.stringify(env)} in tests`)
    }
  }
}))

jest.mock('child_process', () => {
  const fakeEventEmitter = () => ({
    on: jest.fn(),
    off: jest.fn()
  })
  return {
    spawn: jest.fn().mockReturnValue({
      stdout: fakeEventEmitter(),
      stderr: fakeEventEmitter(),
      kill: jest.fn()
    })
  }
})

const { spawn } = require('child_process')
const fetch = require('node-fetch')
const { createToken, withEnvTunnel } = require('./admin')

describe('admin', () => {
  beforeEach(() => {
    fetch.mockReturnValue(
      Promise.resolve({
        status: 200,
        text: () => Promise.resolve('token')
      })
    )
  })

  it('should send the right request', async () => {
    await createToken('fakedomain.cozy.rocks', ['io.cozy.todos'])
    expect(fetch).toHaveBeenCalledWith(
      'https://admin/instances/token?Domain=fakedomain.cozy.rocks&Audience=cli&Scope=io.cozy.todos',
      {
        agent: expect.anything(),
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-type': 'application/json',
          Authorization: 'Basic dXNlcjpwYXNzd29yZA=='
        }
      }
    )
  })
})

describe('withEnvTunnel', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  it('should call correctly ssh', async () => {
    const cb = jest.fn().mockResolvedValue('ret-value')
    const res = await withEnvTunnel(['prod', 'dev'], cb)
    expect(res).toBe('ret-value')
    expect(spawn).toHaveBeenCalledWith('ssh', [
      '-tt',
      '-fN',
      '-L',
      '6065:gozy-adm-prod:6060',
      '-L',
      '6061:gozy-adm-dev:6060',
      'bounce2'
    ])
  })

  it('shorthand version should work', async () => {
    const cb = jest.fn().mockResolvedValue('ret-value')
    const res = await withEnvTunnel(['prod'], cb)
    expect(res).toBe('ret-value')
    expect(spawn).toHaveBeenCalledWith('ssh', [
      '-tt',
      '-fN',
      '-L',
      '6065:gozy-adm-prod:6060',
      'bounce2'
    ])
  })
})
