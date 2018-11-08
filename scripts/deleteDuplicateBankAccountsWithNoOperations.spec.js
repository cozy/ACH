const {
  findDuplicateAccountsWithNoOperations
} = require('./deleteDuplicateBankAccountsWithNoOperations')

describe('deleteDuplicateBankAccountsWithNoOperations', () => {
  it('should return duplicate with no operations', () => {
    const res = findDuplicateAccountsWithNoOperations(
      [
        { _id: 'empty', label: 'Duplicate account' },
        { _id: 'filled', label: 'Duplicate account' },
        { _id: 'filled_not_duplicate', label: 'Account with ops' }
      ],
      [
        { _id: 'op1', account: 'filled' },
        { _id: 'op2', account: 'filled' },
        { _id: 'op3', account: 'filled' },
        { _id: 'op4', account: 'filled' },
        { _id: 'op5', account: 'filled_not_duplicate' },
        { _id: 'op6', account: 'filled_not_duplicate' },
        { _id: 'op7', account: 'filled_not_duplicate' }
      ]
    )

    expect(res.map(x => x._id)).toEqual(['empty'])
  })
})
