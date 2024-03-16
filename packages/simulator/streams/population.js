const { from, shareReplay, filter } = require('rxjs')
const { map } = require('rxjs/operators')
const { readCsv } = require('../lib/utils/adapters/csv')
const coords = require('swe-coords')
const { convertPosition } = require('../lib/utils/geo/distance')

// read the SWEREF99 x,y combined string for a square km and return a WGS84 lat lon object
// TODO: understand if the coordinate is the center of the square or the top left corner (if so, maybe add an offset to the position to get the center)
function parseRuta(ruta) {
  return convertPosition(coords.toLatLng(ruta.slice(6), ruta.slice(0, 6)))
}

function read() {
  return from(readCsv(process.cwd() + '/data/population/5arsklasser_1km.csv')).pipe(
    map(({ id, rutstorl: area, ruta, beftotalt: population, ...ages }) => ({
      id,
      area,
      ruta,
      position: parseRuta(ruta),
      ages: Object.values(ages).map((nr) => parseFloat(nr, 10)),
      population: parseFloat(population, 10),
    })),
    filter((p) => p.population > 0), // only keep squares with people living there.
    shareReplay()
  )
}

module.exports = read()
