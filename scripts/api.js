const mkAPI = client => {
  
  const api = {
    fetchAll: async (doctype, queryOptions = '') => {
      try {
        const result = await client.fetchJSON('GET', `/data/${doctype}/_all_docs?${queryOptions}`)
        return result.rows.filter(x => x.id.indexOf('_design') !== 0)
      } catch (e) {
        if (e.reason.reason == 'Database does not exist.') {
          return []
        }
        throw e
      }
    },

    updateAll: async (doctype, docs) => {
      if (!docs || docs.length === 0) {
        return []
      }
      return client.fetchJSON(
        'POST', `/data/${doctype}/_bulk_docs`,
        { docs }
      )
    },

    deleteAll: async (doctype, docs) => {
      const udocs = docs.map(flagForDeletion)
      return api.updateAll(doctype, docs)
    }
  }

  return api
}

module.exports = mkAPI
