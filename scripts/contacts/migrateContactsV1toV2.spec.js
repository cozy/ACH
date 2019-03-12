const MockDate = require('mockdate')

const utils = require('../../libs/utils')
const migrateContactsV1toV2 = require('./migrateContactsV1toV2')

jest.mock('../../libs/utils')

const fetchJSONSpy = jest.fn()

const ACCOUNT_ID = '39c86201-8dda-489c-b313-eaa06ca4fe95'
const CONTACT_ACCOUNT_ID = 'ee942dd5-a562-40b4-864d-162563985639'
const MOCKED_DATE = '2017-03-04T08:28:24.054Z'

const accountsFixture = {
  rows: [
    {
      id: 'f0412ccf-aaf2-444c-922f-a7c5e8926705',
      doc: {
        account_type: 'whatever'
      }
    },
    {
      id: ACCOUNT_ID,
      doc: {
        _id: ACCOUNT_ID,
        _rev: '2-8370061d-925b-40ee-b1d5-463d2049ae3f',
        account_type: 'google',
        auth: {},
        name: '',
        oauth: {
          access_token: 'xxxxxxxx',
          expires_at: '2019-03-04T15:28:24.054Z',
          refresh_token: '1/xxxxxxxx',
          token_type: 'Bearer'
        },
        oauth_callback_results: {
          id_token: '',
          scope:
            'https://www.googleapis.com/auth/contacts.readonly openid https://www.googleapis.com/auth/userinfo.email'
        }
      }
    }
  ]
}

const contactsFixture = {
  rows: [
    // contact imported from google:
    {
      id: '0241b297-0df8-4137-a072-30d1736b0cc4',
      doc: {
        name: { familyName: 'Runolfsson', givenName: 'Carole' },
        phone: [],
        email: [],
        address: [],
        metadata: {
          version: 1,
          google: { metadata: {}, from: 'appvengers.cedric@gmail.com' }
        },
        vendorId: 'people/c104447654193047000'
      }
    },
    // contact created in Contacts app:
    {
      id: '62726133-20a0-4d3b-bd2f-bf67836e81d9',
      doc: {
        name: { familyName: 'Emilia', givenName: 'Hilpert' },
        phone: [],
        email: [],
        address: [],
        metadata: {
          cozy: true,
          version: 1
        }
      }
    },
    // contact imported from vcard
    {
      id: '6ce9fc8c-d1ce-49e5-bfc7-be263c55e606',
      doc: {
        name: { familyName: 'Hector', givenName: 'Stark' },
        phone: [],
        email: [],
        address: [],
        metadata: {
          version: 1
        }
      }
    }
  ]
}

beforeAll(() => {
  MockDate.set(MOCKED_DATE)
})

afterAll(() => {
  MockDate.reset()
})

describe('Contacts: migrate cozy metadata (konnector v1 to v2)', () => {
  const fakeClient = {
    fetchJSON: fetchJSONSpy
  }
  const fakeACH = {
    client: fakeClient
  }
  const logWithInstanceSpy = jest.fn()

  beforeEach(() => {
    utils.getWithInstanceLogger.mockReturnValue(logWithInstanceSpy)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should migrate cozy metadata', async () => {
    fetchJSONSpy.mockResolvedValueOnce(accountsFixture)
    fetchJSONSpy.mockResolvedValueOnce(contactsFixture)

    // create contact account
    fetchJSONSpy.mockResolvedValueOnce({
      id: CONTACT_ACCOUNT_ID
    })

    await migrateContactsV1toV2.run(fakeACH, false)

    expect(fetchJSONSpy).toHaveBeenCalledTimes(4)

    const expectedDocs = [
      {
        cozyMetadata: {
          doctypeVersion: 2,
          createdAt: undefined,
          createdByApp: 'konnector-google',
          createdByAppVersion: undefined,
          updatedByApps: [
            {
              date: MOCKED_DATE,
              slug: 'konnector-google'
            }
          ],
          updatedAt: MOCKED_DATE,
          sourceAccount: ACCOUNT_ID,
          sync: {
            [CONTACT_ACCOUNT_ID]: {
              konnector: 'konnector-google',
              lastSync: MOCKED_DATE,
              contactsAccountsId: CONTACT_ACCOUNT_ID,
              id: 'people/c104447654193047000',
              remoteRev: undefined
            }
          }
        },
        me: false,
        name: { familyName: 'Runolfsson', givenName: 'Carole' },
        phone: [],
        email: [],
        address: [],
        metadata: {
          google: { metadata: {}, from: 'appvengers.cedric@gmail.com' }
        },
        relationships: {
          accounts: {
            data: [
              {
                _id: CONTACT_ACCOUNT_ID,
                _type: 'io.cozy.contacts.accounts'
              }
            ]
          }
        }
      },
      {
        cozyMetadata: {
          doctypeVersion: 2,
          createdAt: undefined,
          createdByApp: 'Contacts',
          createdByAppVersion: undefined,
          updatedByApps: [
            {
              date: MOCKED_DATE,
              slug: 'Contacts',
              version: undefined
            }
          ],
          updatedAt: MOCKED_DATE,
          sourceAccount: undefined,
          sync: undefined
        },
        me: false,
        name: { familyName: 'Emilia', givenName: 'Hilpert' },
        phone: [],
        email: [],
        address: [],
        relationships: {
          accounts: {
            data: []
          }
        }
      },
      {
        cozyMetadata: {
          doctypeVersion: 2,
          createdAt: undefined,
          createdByApp: 'Contacts',
          createdByAppVersion: undefined,
          updatedByApps: [
            {
              date: MOCKED_DATE,
              slug: 'Contacts',
              version: undefined
            }
          ],
          updatedAt: MOCKED_DATE,
          sourceAccount: undefined,
          sync: undefined
        },
        me: false,
        name: { familyName: 'Hector', givenName: 'Stark' },
        phone: [],
        email: [],
        address: [],
        relationships: {
          accounts: {
            data: []
          }
        }
      }
    ]
    expect(fetchJSONSpy).toHaveBeenNthCalledWith(
      4,
      'POST',
      '/data/io.cozy.contacts/_bulk_docs',
      { docs: expectedDocs }
    )
  })

  it('should not update data in dry run mode', async () => {
    fetchJSONSpy.mockResolvedValueOnce(accountsFixture)
    fetchJSONSpy.mockResolvedValueOnce(contactsFixture)

    await migrateContactsV1toV2.run(fakeACH, true)

    expect(fetchJSONSpy).toHaveBeenCalledTimes(2)
    expect(fetchJSONSpy.mock.calls[0][0]).toEqual('GET')
    expect(fetchJSONSpy.mock.calls[1][0]).toEqual('GET')
    expect(logWithInstanceSpy).toHaveBeenCalledTimes(4)
  })
})
