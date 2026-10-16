import { MILES_BY_LEVEL_KEYS, RISK_LEVELS_IN_ORDER } from '../config/riskConfig'
import type { RiskLevel } from '../types/risk'
import type { MilesByLevel, RoutePlan } from '../types/tripPlan'

// One colored piece of a route's risk bar.
export type RiskBarSegment = {
  level: RiskLevel
  miles: number
  // Share of the route's miles, 0 to 100; the piece's width.
  percent: number
}

// Pieces of the risk bar, calm to worst; levels with no miles get no piece.
export function getRiskBarSegments(milesByLevel: MilesByLevel): RiskBarSegment[] {
  let totalMiles = 0
  for (const level of RISK_LEVELS_IN_ORDER) {
    totalMiles += milesByLevel[MILES_BY_LEVEL_KEYS[level]]
  }

  const segments: RiskBarSegment[] = []
  if (totalMiles === 0) return segments

  for (const level of RISK_LEVELS_IN_ORDER) {
    const miles = milesByLevel[MILES_BY_LEVEL_KEYS[level]]
    if (miles === 0) continue

    segments.push({ level, miles, percent: (miles / totalMiles) * 100 })
  }

  return segments
}

// Miles at High or worse: the part of the trip worth worrying about.
export function getRiskyMiles(milesByLevel: MilesByLevel): number {
  return milesByLevel.high + milesByLevel.severe + milesByLevel.no_travel
}

// Risky miles as a whole percent of the trip, e.g. 7.
export function getRiskyPercent(riskyMiles: number, distanceMi: number): number {
  if (distanceMi === 0) return 0

  return Math.round((riskyMiles / distanceMi) * 100)
}

// Id of the quickest route; the card shows a "Fastest" pill on it when it isn't the recommended one.
export function getFastestRouteId(routes: RoutePlan[]): string {
  let fastestRoute = routes[0]
  for (const route of routes) {
    if (route.duration_s < fastestRoute.duration_s) {
      fastestRoute = route
    }
  }

  return fastestRoute.id
}
