import { describe, expect, it } from 'vitest'
import { makeRoutePlan } from '../test/makeRoutePlan'
import type { TripPlan } from '../types/tripPlan'
import { getRouteById, getRouteOptionName, getRoutesInRankOrder } from './tripPlanRoutes'

// A plan with routes A, B and C; only the routes matter here.
const tripPlan: TripPlan = {
  origin: { label: 'Dallas, Texas', lat: 32.7767, lon: -96.797 },
  destination: { label: 'Houston, Texas', lat: 29.7604, lon: -95.3698 },
  departure_utc: '2026-10-13T13:00:00Z',
  recommended_route_id: 'B',
  reason: 'Route B has 0.0 Severe miles vs 40.0 on Route A.',
  warning: null,
  notes: [],
  routes: [makeRoutePlan({ id: 'A' }), makeRoutePlan({ id: 'B' }), makeRoutePlan({ id: 'C' })],
  corridor_points: [],
  corridor_cell_size_deg: 0.25,
}

describe('getRouteById', () => {
  it('returns the route with the given id', () => {
    expect(getRouteById(tripPlan, 'B').id).toBe('B')
  })

  it('falls back to the first route for an unknown id', () => {
    expect(getRouteById(tripPlan, 'Z').id).toBe('A')
  })
})

describe('getRoutesInRankOrder', () => {
  it('puts the recommended route first', () => {
    const routes = [
      makeRoutePlan({ id: 'A', rank: 2 }),
      makeRoutePlan({ id: 'B', rank: 1 }),
      makeRoutePlan({ id: 'C', rank: 3 }),
    ]

    expect(getRoutesInRankOrder(routes).map((route) => route.id)).toEqual(['B', 'A', 'C'])
  })

  it('keeps a single route', () => {
    expect(getRoutesInRankOrder([makeRoutePlan({ id: 'A' })]).map((route) => route.id)).toEqual(['A'])
  })
})

describe('getRouteOptionName', () => {
  it('names a route after its rank, so the recommended route is Option 1', () => {
    expect(getRouteOptionName(makeRoutePlan({ id: 'C', rank: 2 }))).toBe('Option 2')
  })
})
