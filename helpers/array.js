const { isEqual, uniqWith } = require('lodash')

const arrayHasSameValue = arr => {
  return uniqWith(arr, isEqual).length === 1
}

const getRandomValueFromArray = (arr, exclude) => {
  const randIdx = Math.floor(Math.random() * arr.length)
  const selectedValue =
    exclude && isEqual(exclude, arr[randIdx]) && !arrayHasSameValue(arr)
      ? getRandomValueFromArray(arr, exclude)
      : arr[randIdx]

  return selectedValue
}

module.exports = {
  arrayHasSameValue,
  getRandomValueFromArray
}
