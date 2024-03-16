const { from, share } = require('rxjs')

const regions = {
  norrbotten: require('./norrbotten'),
  // skane: require('./skane'),
  // gotland: require('./gotland'),
}

const kommuner = require('../index')

module.exports = (savedParams) => {
  const kommunerStream = kommuner.read(savedParams)
  const includedRegions = Object.entries(regions)
    .filter(
      ([region]) =>
        process.env.REGIONS?.includes(region) ||
        process.env.REGIONS === '*' ||
        !process.env.REGIONS
    )
    .map(([, region]) => region)
  return from(includedRegions.map((region) => region(kommunerStream))).pipe(
    share()
  )
}
