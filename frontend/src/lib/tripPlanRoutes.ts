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
