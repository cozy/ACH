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

const runParallel = module.exports.runParallel = function (arr, createPromise) {
  return Promise.all(arr.map(createPromise))
}

const pushAll = function (arr, otherArr) {
  return arr.push.apply(arr, otherArr)
}

module.exports.runParallelAfterFirst = function (arr, createPromise) {
  const results = []
  const rest = arr.slice(1)
  return createPromise(arr[0]).then(res => {
    results.push(res)
    return runParallel(rest, createPromise).then(restResults => {
      pushAll(results, restResults)
      return results
    })
  })
}

