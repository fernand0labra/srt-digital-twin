const {
  map,
  filter,
  shareReplay,
  distinctUntilChanged,
  mergeMap,
  of,
  from,
  catchError,
  throttleTime,
  mapTo,
  tap,
  mergeAll,
  share,
  retryWhen,
  delay,
  take,
} = require('rxjs')
const { virtualTime } = require('../utils/virtualTime')

const { safeId } = require('../utils/id')
const moment = require('moment')
const Booking = require('./booking')
const pelias = require('../deps/pelias')
const { error } = require('../log')
const { getHours, getISODay } = require('date-fns')
const Position = require('./geo/position')

class Citizen {
  constructor({ name, position, workplace, home, startPosition, kommun }) {
    this.id = 'p-' + safeId()
    this.workplace = {
      name: workplace.name || 'arbetsplats',
      position: new Position(workplace.position),
    }
    this.home = {
      name: home.name || 'hemma',
      position: new Position(home.position),
    }
    this.name = name
    this.position = new Position(position)
    this.startPosition = new Position(startPosition || this.position)
    this.kommun = kommun
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

    this.intents = virtualTime.getTimeStream().pipe(
      throttleTime(1000), // throttleTime 1000ms is used to not use the same update interval as the clock (100 ms)
      map((date) => ({
        hour: getHours(date),
        weekDay: getISODay(date),
      })),
      filter(() => Math.random() > 0.9),
      map(({ hour }) => {
        if (hour < 4 && hour > 22) return 'sleep'
        if (hour >= 11 && hour <= 13) return 'lunch'
        if (hour >= 6 && hour < 10) return 'goToWork'
        if (hour >= 16 && hour <= 18) return 'goHome'
        // pickup kids
        // go to gym
        // go to school etc
        return 'idle'
      })
    )

    const ignoredIntents = ['sleep', 'idle']
    this.bookings = this.intents.pipe(
      distinctUntilChanged(),
      filter((intent) => !ignoredIntents.includes(intent)),
      catchError((err) => error('passenger bookings err', err)),
      mergeMap(async (intent) => {
        switch (intent) {
          case 'goToWork':
            return of(
              new Booking({
                type: 'passenger',
                passenger: this,
                pickup: this.home,
                destination: {
                  ...this.workplace,
                  departureTime: moment(
                    await virtualTime.getTimeInMillisecondsAsPromise()
                  )
                    .add(1, 'hour')
                    .format('hh:mm:ss'),
                },
              })
            )
          case 'goHome':
            return of(
              new Booking({
                type: 'passenger',
                passenger: this,
                pickup: {
                  ...this.workplace,
                  departureTime: moment(
                    await virtualTime.getTimeInMillisecondsAsPromise()
                  )
                    .add(1, 'hour')
                    .format('hh:mm:ss'),
                },
                destination: this.home,
              })
            )
          case 'lunch':
            return of(this.workplace.position).pipe(
              filter(() => Math.random() < 0.1), // 10% of the time, eat at a restaurant
              mergeMap((position) =>
                pelias.searchOne('restaurang', position, 'venue')
              ),
              retryWhen((errors) =>
                errors.pipe(delay(Math.random() * 10000), take(3))
              ), // retry 3 times - all lunch searches happens at the same time
              filter((position) => position != null),
              mergeMap(async (lunchPlace) =>
                from([
                  new Booking({
                    type: 'passenger',
                    passenger: this,
                    // Pickup to go to lunch
                    pickup: {
                      ...this.workplace,
                      departureTime: moment(
                        await virtualTime.getTimeInMillisecondsAsPromise()
                      )
                        .add(1, 'hour')
                        .format('hh:mm:ss'),
                    },
                    destination: lunchPlace,
                  }),
                  new Booking({
                    // Go back from lunch to work
                    type: 'passenger',
                    passenger: this,
                    pickup: {
                      ...lunchPlace,
                      departureTime: moment(
                        await virtualTime.getTimeInMillisecondsAsPromise()
                      )
                        .add(2, 'hour')
                        .format('hh:mm:ss'),
                    },
                    destination: this.workplace,
                  }),
                ])
              )
            )
        }
        return of(null)
      }),
      mergeAll(), // since previous step returns a promise, we need to resolve "one step deeper"
      catchError((err) => error('passenger bookings err', err)),
      filter((f) => f instanceof Booking),
      shareReplay()
    )

    this.pickedUpEvents = this.bookings.pipe(
      mergeMap((booking) => booking.pickedUpEvents),
      tap((booking) => {
        this.inVehicle = true
        this.position = booking.pickup.position
      }),
      mapTo(this),
      share()
    )

    this.deliveredEvents = this.bookings.pipe(
      mergeMap((booking) => booking.deliveredEvents),
      tap((booking) => {
        this.inVehicle = false
        this.position = booking.destination.position
      }),
      mapTo(this),
      share()
    )
  }

  reset() {
    this.position = this.startPosition
    this.inVehicle = false
  }

  toObject() {
    const obj = {
      co2: this.co2,
      cost: this.cost,
      distance: this.distance,
      id: this.id,
      inVehicle: this.inVehicle,
      moveTime: this.moveTime,
      name: this.name,
      position: this.position,
      waitTime: this.waitTime,
      kommun: this.kommun.name,
      home: this.home,
      workplace: this.workplace,
    }
    return obj
  }

  moved(position, metersMoved, co2, cost, moveTime) {
    this.position = position

    // Aggregate values
    this.co2 += co2
    this.cost += cost
    this.distance += metersMoved
    this.moveTime += moveTime
  }
}

module.exports = Citizen
