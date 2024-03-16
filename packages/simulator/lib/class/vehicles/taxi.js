const { findBestRouteToPickupBookings } = require('../../utils/dispatch/taxiDispatch')
const { safeId } = require('../../utils/id')
const { debug } = require('../../log')
const Vehicle = require('./vehicle')
const { virtualTime } = require('../../utils/virtualTime')
const fleet = {
  name: 'taxi',
}

class Taxi extends Vehicle {
  id
  position
  heading
  constructor({ id = 't-' + safeId(), position, startPosition, ...vehicle }) {
    super({ position, id, fleet, ...vehicle })
    this.id = id
    this.position = position
    this.heading = null
    this.cargo = []
    this.passengers = []
    this.queue = []
    this.passengerCapacity = 4 // TODO: Set this when constructing the vehicle
    this.parcelCapacity = 0 // TODO: Set this when constructing the vehicle
    this.booking = true
    this.vehicleType = 'taxi'
    this.startPosition = startPosition || position
    this.co2PerKmKg = 0.1201 // NOTE: From a quick google. Needs to be verified.
    this.plan = []
    this.instruction = null
  }

  stopped() {
    if (this.status === 'returning' && !this.plan?.length)
      return debug(this.id, 'returned') // we are done - we have returned to origin
    super.stopped()
    this.pickNextInstructionFromPlan()
  }

  canPickupMorePassengers() {
    if (this.passengerCapacity > this.passengers.length) return true
    return false
  }

  async pickNextInstructionFromPlan() {
    this.instruction = this.plan?.shift()
    this.booking = this.instruction?.booking
    this.status = this.instruction?.action || 'ready'
    this.statusEvents.next(this)
    switch (this.status) {
      case 'pickup':
        await virtualTime.waitUntil(this.instruction.arrival)
        this.status = 'toPickup'
        return this.navigateTo(this.booking.pickup.position)
      case 'delivery':
        this.status = 'toDelivery'
        await virtualTime.waitUntil(this.instruction.arrival)
        return this.navigateTo(this.booking.destination.position)
      case 'start':
        return this.pickNextInstructionFromPlan()
      case 'returning':
        this.status = 'ready'
        if (this.plan.length) return this.pickNextInstructionFromPlan() // we might have new bookings
        return
      default:
        this.status = 'returning'
        return this.navigateTo(this.startPosition)
    }
  }

  async pickup() {
    debug('Pickup passenger', this.id, this.booking?.passenger?.name)
    this.passengers.push(this.booking.passenger)
    this.cargoEvents.next(this)
    this.booking.pickedUp(this.position)
  }

  async dropOff() {
    debug('Dropoff passenger', this.id, this.booking?.passenger?.name)
    this.passengers = this.passengers.filter(
      (p) => p !== this.booking.passenger
    )
    this.cargoEvents.next(this)
    this.booking.delivered(this.position)
  }

  canHandleBooking(booking) {
    if (booking.type === 'parcel') {
      if (this.cargo.length < this.parcelCapacity) return true
      return false
    }
    if (booking.type === 'passenger') {
      if (this.passengers.length < this.passengerCapacity) return true
      return false
    }
    return false
  }

  async handleBooking(booking) {
    this.queue.push(booking)
    booking.assign(this)
    booking.queued(this)

    debug('🙋‍♂️ Dispatching', booking.id, 'to', this.id)

    clearTimeout(this._timeout)
    this._timeout = setTimeout(async () => {
      this.plan = await findBestRouteToPickupBookings(this, this.queue)

      if (!this.instruction) await this.pickNextInstructionFromPlan()
    }, 2000)

    return booking
  }
}

module.exports = Taxi
