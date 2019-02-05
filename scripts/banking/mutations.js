const mutations = {
  execute: async (obj, api) => {
    for (let doctype in obj.toUpdate) {
      await api.updateAll(doctype, obj.toUpdate[doctype])
    }
    for (let doctype in obj.toDelete) {
      await api.deleteAll(doctype, obj.toDelete[doctype])
    }
  },
  display: mutation => {
    for (const [doctype, docs] of Object.entries(mutation.toUpdate)) {
      if (!docs || docs.length === 0) {
        continue
      }
      console.log(`Would update ${doctype} ${docs.length} docs`)
    }
    for (const [doctype, docs] of Object.entries(mutation.toDelete)) {
      if (!docs || docs.length === 0) {
        continue
      }
      console.log(`Would delete ${doctype} ${docs.length} docs`)
    }
  }
}

module.exports = mutations
