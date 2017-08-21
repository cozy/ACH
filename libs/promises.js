/**
 * Different strategies on how to create promises
 */

module.exports.runSerially = function (arr, createPromise) {
  let prom
  const results = []
  for (let i in arr) {
    let item = arr[i]
    prom = !prom ? createPromise(item) : prom.then(res => {
      return createPromise(item)
    })
    prom = prom.then(function (res) {
      results.push(res)
      return res
    })
  }
  return prom.then(() => results)
}

module.exports.runParallel = function (arr, createPromise) {
  return Promise.all(arr.map(createPromise))
}

module.exports.runParallelAfterFirst = function (arr, createPromise) {
  const results = []
  const rest = arr.slice(1)
  return createPromise(arr[0]).then(res => {
    results.push(res)
    return runParallel(rest, createPromise).then(restResults => {
      results.push.call(results, restResults)
      return results
    })
  })
}

