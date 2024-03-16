const { haversine } = require('../../utils/geo/distance')

function convertPosition(pos) {
  return {
    lon: pos.longitude || pos.lon || pos.lng || pos[0],
    lat: pos.latitude || pos.lat || pos[1],
  }
}

class Position {
  constructor(pos) {
    const { lon, lat } = convertPosition(pos)
    this.lon = lon
    this.lat = lat
  }

  isValid() {
    if (!this.lon || !this.lat) return false
    if (this.lon < -180 || this.lon > 180) return false
    if (this.lat < -90 || this.lat > 90) return false
    if (isNaN(this.lon) || isNaN(this.lat)) return false

    return true
  }

  distanceTo(position) {
    return haversine(this, position)
  }

  toObject() {
    return { lon: this.lon, lat: this.lat }
  }

  toString() {
    return JSON.stringify(this.toObject(), null, 2)
  }
}

module.exports = Position
