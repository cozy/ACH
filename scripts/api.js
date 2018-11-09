const mkAPI = client => {
  const api = {
    fetchAll: async doctype => {
      console.warn('Do not use api, prefer to use cozy-doctypes')
      try {
        const result = await client.fetchJSON(
          'GET',
          `/data/${doctype}/_all_docs?include_docs=true`
        )
        return result.rows
          .filter(x => x.id.indexOf('_design') !== 0)
          .map(x => x.doc)
      } catch (e) {
        if (e.reason && e.reason.reason == 'Database does not exist.') {
          return []
        }
        throw e
      }
    },

    updateAll: async (doctype, docs) => {
      console.warn('Do not use api, prefer to use cozy-doctypes')
      if (!docs || docs.length === 0) {
        return []
      }
      return client.fetchJSON('POST', `/data/${doctype}/_bulk_docs`, { docs })
    }
  }

  return api
}

module.exports = mkAPI
