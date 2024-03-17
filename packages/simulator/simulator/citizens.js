const { take, map, filter, mergeAll } = require('rxjs/operators')
const { randomNames } = require('../lib/utils/personNames')
const Citizen = require('../lib/class/citizen')
const { from, zip } = require('rxjs')
const { getAddressesInArea } = require('./address')

const getCitizensInSquare = (
  { position, area, population },
  workplaces,
  kommunName
) => {
  const nrOfCitizens = Math.floor(population * 0.01) // sample x% of the population
  if (nrOfCitizens === 0) return from([])
  const addresses = from(getAddressesInArea(position, area, nrOfCitizens)).pipe(
    mergeAll()
  )
  return zip([
    addresses.pipe(take(nrOfCitizens)),
    randomNames.pipe(take(nrOfCitizens)),
    workplaces.pipe(take(nrOfCitizens)),
  ]).pipe(
    map(([home, name, workplace]) => {
      return (
        home &&
        new Citizen({
          ...name,
          home,
          // age: ages[Math.floor(Math.random() * ages.length)],
          workplace,
          kommun: kommunName,
          position: home.position,
        })
      )
    }),
    filter((citizen) => citizen),
    take(nrOfCitizens)
  )
}

module.exports = {
  getCitizensInSquare,
}
