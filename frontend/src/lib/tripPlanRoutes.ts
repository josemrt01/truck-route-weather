import type { RoutePlan, TripPlan } from '../types/tripPlan'

// The route with the given id, e.g. the recommended one; used by App and MapView.
export function getRouteById(tripPlan: TripPlan, routeId: string): RoutePlan {
  for (const route of tripPlan.routes) {
    if (route.id === routeId) {
      return route
    }
  }

  // Shouldn't happen (the backend always sends a matching id); fall back to the first route instead of crashing.
  return tripPlan.routes[0]
}

// Routes ordered by rank, recommended first; used by RouteCards.
export function getRoutesInRankOrder(routes: RoutePlan[]): RoutePlan[] {
  const routesInRankOrder: RoutePlan[] = []

  // Rank 1 goes in slot 0, rank 2 in slot 1, and so on; the backend sends ranks 1, 2, 3 without gaps.
  for (const route of routes) {
    routesInRankOrder[route.rank - 1] = route
  }

  return routesInRankOrder
}

// What the user sees for a route: "Option 1" is the recommended one, then the next best; used by RouteCard and App.
export function getRouteOptionName(route: RoutePlan): string {
  return `Option ${route.rank}`
}
