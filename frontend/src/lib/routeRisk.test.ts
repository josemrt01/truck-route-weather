import { describe, expect, it } from 'vitest'
import { makeRoutePlan } from '../test/makeRoutePlan'
import type { MilesByLevel } from '../types/tripPlan'
import { getFastestRouteId, getRiskyMiles, getRiskyPercent } from './routeRisk'

// 200 miles in all: mostly Low, some High and Severe, no Moderate or No Travel.
const milesByLevel: MilesByLevel = { low: 150, moderate: 0, high: 30, severe: 20, no_travel: 0 }

describe('getRiskyMiles', () => {
  it('adds High, Severe and No Travel miles', () => {
    expect(getRiskyMiles({ ...milesByLevel, no_travel: 5 })).toBe(55)
  })
})

describe('getRiskyPercent', () => {
  it('rounds the share of the trip to a whole percent', () => {
    expect(getRiskyPercent(16, 225)).toBe(7)
  })

  it('is 0 for a route without distance', () => {
    expect(getRiskyPercent(0, 0)).toBe(0)
  })
})

describe('getFastestRouteId', () => {
  it('returns the id of the shortest duration', () => {
    const routes = [
      makeRoutePlan({ id: 'A', duration_s: 12_000 }),
      makeRoutePlan({ id: 'B', duration_s: 11_000 }),
      makeRoutePlan({ id: 'C', duration_s: 15_000 }),
    ]

    expect(getFastestRouteId(routes)).toBe('B')
  })
})
