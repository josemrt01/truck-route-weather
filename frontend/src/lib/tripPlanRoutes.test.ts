import { describe, expect, it } from 'vitest'
import { RiskLevel } from '../types/risk'
import type { RoutePlan, TripPlan } from '../types/tripPlan'
import { getRouteById } from './tripPlanRoutes'

// Builds a route for the tests; only the id matters here.
function makeRoute(id: string): RoutePlan {
  return {
    id,
    rank: 1,
    geometry: [],
    distance_mi: 0,
    duration_s: 0,
    arrival_utc: '2026-10-13T16:27:00Z',
    miles_by_level: { low: 0, moderate: 0, high: 0, severe: 0, no_travel: 0 },
    avg_risk: 0,
    worst_level: RiskLevel.LOW,
    checkpoints: [],
  }
}

// A plan with routes A, B and C; only the routes matter here.
const tripPlan: TripPlan = {
  origin: { label: 'Dallas, Texas', lat: 32.7767, lon: -96.797 },
  destination: { label: 'Houston, Texas', lat: 29.7604, lon: -95.3698 },
  departure_utc: '2026-10-13T13:00:00Z',
  recommended_route_id: 'B',
  reason: 'Route B has 0.0 Severe miles vs 40.0 on Route A.',
  warning: null,
  notes: [],
  routes: [makeRoute('A'), makeRoute('B'), makeRoute('C')],
}

describe('getRouteById', () => {
  it('returns the route with the given id', () => {
    expect(getRouteById(tripPlan, 'B').id).toBe('B')
  })

  it('falls back to the first route for an unknown id', () => {
    expect(getRouteById(tripPlan, 'Z').id).toBe('A')
  })
})
