import { RiskLevel } from '../types/risk'
import type { RoutePlan } from '../types/tripPlan'

// A route for tests with neutral values; pass only the fields the test cares about.
export function makeRoutePlan(overrides: Partial<RoutePlan>): RoutePlan {
  return {
    id: 'A',
    rank: 1,
    geometry: [],
    distance_mi: 0,
    duration_s: 0,
    arrival_utc: '2026-10-13T16:27:00Z',
    miles_by_level: { low: 0, moderate: 0, high: 0, severe: 0, no_travel: 0 },
    avg_risk: 0,
    worst_level: RiskLevel.LOW,
    checkpoints: [],
    // The given fields replace the defaults above.
    ...overrides,
  }
}
