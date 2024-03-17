const { from, shareReplay } = require('rxjs')
const { map } = require('rxjs/operators')
const { readXlsx } = require('../../../lib/utils/adapters/xlsx')
const sweCoords = require('swe-coords')

function execute() {
  return from(
    readXlsx(
      `${process.cwd()}/data/bookings/helsingborg/${
        process.env.transports_file || 'transports2021.xlsx'
      }`,
      `${process.env.transports_sheet || 'Blad1'}`
    )
  ).pipe(
    map(
      ({
        x,
        y,
        'HBG nr': hbgNr,
        //'Traffic Web': trafficWeb,
        Mätår: year,
        Månad: month,
        UT,
        IN,
        Rikt: directionInSwedish,
        'VaDT Tung': heavyTrafficCount,
      }) => ({
        kommun: 'Helsingborg',
        position: sweCoords.toLatLng(
          Math.floor(x).toString(),
          Math.floor(y).toString()
        ),
        year,
        month,
        heavyTrafficCount: Math.round(heavyTrafficCount / (IN - UT)),
        id: hbgNr,
        direction: directionInSwedish,
      })
    ),
    map(({ position: { lat, lng }, ...rest }) => ({
      position: { lat, lon: lng },
      ...rest,
    })),
    shareReplay()
  )
}

module.exports = execute()
