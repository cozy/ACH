const mutations = require('./mutations')

const fakeDocs = _ids => _ids.map(_id => ({ _id }))
describe('mutation', () => {
  it('should execute a mutation', async () => {
    const mutation = {
      toDelete: {
        'io.cozy.bank.operations': fakeDocs([1, 2, 3]),
        'io.cozy.bank.accounts': fakeDocs([4, 5, 6])
      },
      toUpdate: {
        'io.cozy.bank.operations': fakeDocs([7, 8, 9])
      }
    }
    const fakeAPI = {
      deleteAll: jest.fn(),
      updateAll: jest.fn()
    }
    await mutations.execute(mutation, fakeAPI)
    expect(fakeAPI.deleteAll).toHaveBeenCalledWith(
      'io.cozy.bank.operations',
      fakeDocs([1, 2, 3])
    )
    expect(fakeAPI.updateAll).toHaveBeenCalledWith(
      'io.cozy.bank.operations',
      fakeDocs([7, 8, 9])
    )
    expect(fakeAPI.deleteAll).toHaveBeenCalledWith(
      'io.cozy.bank.accounts',
      fakeDocs([4, 5, 6])
    )
  })
  it('should detect a conflict', async () => {
    const mutation = {
      toDelete: {
        'io.cozy.bank.operations': fakeDocs([1, 2, 3]),
        'io.cozy.bank.accounts': fakeDocs([4, 5, 6])
      },
      toUpdate: {
        'io.cozy.bank.operations': fakeDocs([1, 8, 9])
      }
    }
    const fakeAPI = {
      deleteAll: jest.fn(),
      updateAll: jest.fn()
    }
    await expect(mutations.execute(mutation, fakeAPI)).rejects.toEqual(
      new Error('Conflict detected')
    )
  })
})