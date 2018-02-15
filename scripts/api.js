const mkAPI = client => {
  
  const api = {
    fetchAll: async (doctype, queryOptions = '') => {
      const result = await client.fetchJSON('GET', `/data/${doctype}/_all_docs?${queryOptions}`)
      return result.rows.filter(x => x.id.indexOf('_design') !== 0)
    },

    updateAll: async (doctype, docs) => {
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
