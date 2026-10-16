import { describe, expect, it } from 'vitest'
import { RiskLevel } from '../types/risk'
import type { RoutePlan } from '../types/tripPlan'
import { getDrawerSummaryText } from './drawerSummary'

// A recommended route of 3 h 27 min whose worst level is Moderate; only these fields matter here.
const route: RoutePlan = {
  id: 'A',
  rank: 1,
  geometry: [],
  distance_mi: 239.2,
  duration_s: 12420,
  arrival_utc: '2026-10-17T18:27:00Z',
  miles_by_level: { low: 200, moderate: 39.2, high: 0, severe: 0, no_travel: 0 },
  avg_risk: 0.2,
  worst_level: RiskLevel.MODERATE,
  checkpoints: [],
}

describe('getDrawerSummaryText', () => {
  it('invites the user to plan a trip when there is no route', () => {
    expect(getDrawerSummaryText(null)).toBe('Plan a trip')
  })

  it('names the selected route with its duration and worst risk', () => {
    expect(getDrawerSummaryText(route)).toBe('Option 1 · 3 h 27 min · Moderate risk')
  })
})
