const { models } = require('cozy-client')
const { Qualification } = models.document

// TODO Les contacts sont gérés via les 'relationships'
// TODO Créer aussi des Contacts ? Sinon dans l'app Mes papiers, les doc seront classés comme contact non défini...

const makeDriverLicenseBack = () => ({
  filename: `Driver license - back`,
  filePath: './data/qualifiedDocuments/driver_license_back.pdf',
  metadata: {
    qualification: Qualification.getByLabel('driver_license'),
    AObtentionDate: null,
    BObtentionDate: '2002-04-10T15:00:00.000Z',
    CObtentionDate: null,
    DObtentionDate: null,
    datetime: '2002-04-10T15:00:00.000Z',
    datetimeLabel: 'datetime',
    number: '789456123789',
    page: 'back'
  }
})

const makeDriverLicenseFront = () => ({
  filename: 'Driver license - front',
  filePath: './data/qualifiedDocuments/driver_license_front.pdf',
  metadata: {
    qualification: Qualification.getByLabel('driver_license'),
    AObtentionDate: null,
    BObtentionDate: '2002-04-10T15:00:00.000Z',
    CObtentionDate: null,
    DObtentionDate: null,
    datetime: '2002-04-10T15:00:00.000Z',
    datetimeLabel: 'datetime',
    number: '789456123789',
    page: 'front'
  }
})

const makeCarInsurance = () => ({
  filename: 'Car insurance',
  filePath: './data/qualifiedDocuments/car_insurance.pdf',
  metadata: {
    qualification: Qualification.getByLabel('car_insurance'),
    datetime: '2022-02-09T09:07:50.000Z',
    datetimeLabel: 'datetime'
  }
})

const makeNationalIdCardBback = () => ({
  filename: 'National id card - back',
  filePath: './data/qualifiedDocuments/national_id_card_back.pdf',
  metadata: {
    qualification: Qualification.getByLabel('national_id_card'),
    cardNumber: '123456789123',
    datetime: '2029-12-31T23:00:00.000Z',
    datetimeLabel: 'expirationDate',
    expirationDate: '2029-12-31T23:00:00.000Z',
    page: 'back'
  }
})

const makeNationalIdCardFront = () => ({
  filename: 'National id card - front',
  filePath: './data/qualifiedDocuments/national_id_card_front.pdf',
  metadata: {
    qualification: Qualification.getByLabel('national_id_card'),
    cardNumber: '123456789123',
    datetime: '2029-12-31T23:00:00.000Z',
    datetimeLabel: 'expirationDate',
    expirationDate: '2029-12-31T23:00:00.000Z',
    page: 'front'
  }
})

// TODO generate other invoices
const makeIspInvoice = () => ({
  filename: 'Isp invoice',
  filePath: './data/qualifiedDocuments/isp_invoice.pdf',
  metadata: {
    qualification: Qualification.getByLabel('isp_invoice'),
    datetime: '2021-08-01T07:58:00.000Z',
    datetimeLabel: 'referencedDate',
    referencedDate: '2021-08-01T07:58:00.000Z'
  }
})

const makeVehicleRegistration = () => ({
  filename: 'Vehicle registration',
  filePath: './data/qualifiedDocuments/vehicle_registration.pdf',
  metadata: {
    qualification: Qualification.getByLabel('vehicle_registration'),
    datetime: '2022-02-09T09:05:38.000Z',
    datetimeLabel: 'datetime'
  }
})

module.exports = {
  getAllDocuments: () => [
    makeDriverLicenseBack(),
    makeDriverLicenseFront(),
    makeCarInsurance(),
    makeNationalIdCardBback(),
    makeNationalIdCardFront(),
    makeIspInvoice(),
    makeVehicleRegistration()
  ]
}
