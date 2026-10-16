import type { MilesByLevel, RoutePlan } from '../types/tripPlan'

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
