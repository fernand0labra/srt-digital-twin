const EventEmitter = require('events')

const { safeId } = require('./../id')
const Journey = require('./journey')

class Passenger extends EventEmitter {
  constructor({ name, journeys, position }) {
    super()
    this.id = safeId()
    this.journeys = journeys?.map((journey) => new Journey({ ...journey, passenger: this}) ) || []
    this.name = name
    this.position = position
    this.distance = 0
    this.cost = 0
    this.co2 = 0
    this.inVehicle = false

    // Aggregated values
    this.co2 = 0
    this.cost = 0
    this.distance = 0
    this.moveTime = 0 // Time on a vehicle.
    this.waitTime = 0 // Time waiting for a vehicle.
  }

  toObject(includeJourneys = true) {
    const obj = {
      co2: this.co2,
      cost: this.cost,
      distance: this.distance,
      id: this.id,
      inVehicle: this.inVehicle,
      journeys: this.journeys,
      moveTime: this.moveTime,
      name: this.name,
      position: this.position,
      waitTime: this.waitTime,
    }
    if(includeJourneys) {
      obj.journeys = this.journeys.map((journey) => journey.toObject())
    }
    return obj
  }

  updateJourney(journeyId, status) {
    const journeyToUpdate = this.journeys.find((journey) => (
      journey.id === journeyId
    ))
    journeyToUpdate.setStatus(status)
  }

  moved(position, metersMoved, co2, cost, moveTime) {
    this.position = position

    // Aggregate values
    this.co2 += co2
    this.cost += cost
    this.distance += metersMoved
    this.moveTime += moveTime

    this.emit('moved', this.toObject())
  }

  pickedUp(journeyId) {
    this.inVehicle = true
    this.updateJourney(journeyId, 'Pågående')
    this.emit('pickedup', this.toObject())
  }

  delivered(journeyId) {
    this.inVehicle = false
    this.updateJourney(journeyId, 'Avklarad')
    this.emit('delivered', this.toObject())
  }
}

module.exports = Passenger