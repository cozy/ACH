const intersection = require('lodash/intersection')
const some = require('lodash/some')

const displayBulkResult = res => {
  if (some(res, x => x.error)) {
    for (const error of res.filter(x => x.error)) {
      console.warn('⚠️', error)
    }
  } else {
    console.log('✅ OK')
  }
}

const ensureNoConflicts = mutation => {
  for (const [doctype, updated] of Object.entries(mutation.toUpdate)) {
    const deleted = mutation.toDelete[doctype] || []
    const conflicts = intersection(
      updated.map(x => x._id),
      deleted.map(x => x._id)
    )
    if (conflicts.length > 0) {
      throw new Error('Conflict detected')
    }
  }
}

const mutations = {
  execute: async (mutation, api) => {
    ensureNoConflicts(mutation)
    const toUpdate = mutation.toUpdate || {}
    const toDelete = mutation.toDelete || {}
    for (const [doctype, docs] of Object.entries(toUpdate)) {
      console.log('Updating', docs.length, 'documents')
      const res = await api.updateAll(doctype, docs)
      displayBulkResult(res)
    }
    for (const [doctype, docs] of Object.entries(toDelete)) {
      console.log('Deleting', docs.length, 'documents')
      const res = await api.deleteAll(doctype, docs)
      displayBulkResult(res)
    }
  },
  display: mutation => {
    const toUpdate = mutation.toUpdate || {}
    const toDelete = mutation.toDelete || {}
    for (const [doctype, docs] of Object.entries(toUpdate)) {
      if (!docs || docs.length === 0) {
        continue
      }
      console.log(`Would update ${doctype} ${docs.length} docs`)
    }
    for (const [doctype, docs] of Object.entries(toDelete)) {
      if (!docs || docs.length === 0) {
        continue
      }
      console.log(`Would delete ${doctype} ${docs.length} docs`)
    }
  }
}

module.exports = mutations
