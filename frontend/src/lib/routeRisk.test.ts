import { describe, expect, it } from 'vitest'
import { makeRoutePlan } from '../test/makeRoutePlan'
import { RiskLevel } from '../types/risk'
import type { MilesByLevel } from '../types/tripPlan'
import { getFastestRouteId, getRiskBarSegments, getRiskyMiles, getRiskyPercent } from './routeRisk'

// 200 miles in all: mostly Low, some High and Severe, no Moderate or No Travel.
const milesByLevel: MilesByLevel = { low: 150, moderate: 0, high: 30, severe: 20, no_travel: 0 }

describe('getRiskBarSegments', () => {
  it('gives each used level its share of the miles, calm to worst', () => {
    expect(getRiskBarSegments(milesByLevel)).toEqual([
      { level: RiskLevel.LOW, miles: 150, percent: 75 },
      { level: RiskLevel.HIGH, miles: 30, percent: 15 },
      { level: RiskLevel.SEVERE, miles: 20, percent: 10 },
    ])
  })

  it('returns nothing for a route without miles', () => {
    expect(getRiskBarSegments({ low: 0, moderate: 0, high: 0, severe: 0, no_travel: 0 })).toEqual([])
  })
})

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
