const { createTrips } = require('./importGeojson')

describe('importGeojson', () => {
  describe('createTrips', () => {
    it('should return array of timeseries', () => {
      const res = createTrips()

      expect(res[0]).toHaveProperty('series')
      expect(res[0]).toHaveProperty('startDate')
      expect(res[0]).toHaveProperty('endDate')
      expect(res[0]).toHaveProperty('cozyMetadata')
      expect(res[0]).toHaveProperty('source')
    })
    it('should return array of 75 timeseries', () => {
      const res = createTrips()

      expect(res).toHaveLength(75)
    })
  })
})
