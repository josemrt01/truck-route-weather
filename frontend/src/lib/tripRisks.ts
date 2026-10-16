import type { OpenMeteoHourly } from '../types/openMeteo'
import type {
  Checkpoint,
  LonLat,
  PlannedRoute,
  PlannedTrip,
  RoutePlan,
  TripPlan,
  TripRisks,
  TripRisksRequest,
} from '../types/tripPlan'
import { roundDownToHour, roundUpToHour } from './dateTime'

// Hours of forecast every checkpoint needs: from the hour of the first ETA to the hour after the last one, so the
// backend finds the hour nearest each ETA; used by getTripPlan.
export type ForecastWindow = {
  firstHourUtc: Date
  lastHourUtc: Date
}

// Every checkpoint of every route, in route order then checkpoint order; their forecasts come back in this order.
export function getCheckpointPoints(routes: PlannedRoute[]): LonLat[] {
  const points: LonLat[] = []
  for (const route of routes) {
    for (const checkpoint of route.checkpoints) {
      points.push([checkpoint.lon, checkpoint.lat])
    }
  }

  return points
}

// One forecast window for all routes: the earliest departure hour to the latest arrival hour.
export function getForecastWindow(routes: PlannedRoute[]): ForecastWindow {
  // Every route leaves at the same time, so the first checkpoint of any route has the earliest ETA.
  const departure = new Date(routes[0].checkpoints[0].eta_utc)

  let latestArrival = departure
  for (const route of routes) {
    const arrival = new Date(route.arrival_utc)
    if (arrival > latestArrival) {
      latestArrival = arrival
    }
  }

  return { firstHourUtc: roundDownToHour(departure), lastHourUtc: roundUpToHour(latestArrival) }
}

// Body of /api/trip-risks: each route's checkpoints with the forecast at the same position in checkpointForecasts
// (the order of getCheckpointPoints).
export function buildTripRisksRequest(
  routes: PlannedRoute[],
  checkpointForecasts: OpenMeteoHourly[],
  weightLb: number,
): TripRisksRequest {
  let forecastIndex = 0

  const requestRoutes: TripRisksRequest['routes'] = []
  for (const route of routes) {
    const checkpoints: TripRisksRequest['routes'][number]['checkpoints'] = []
    for (const checkpoint of route.checkpoints) {
      checkpoints.push({
        mile: checkpoint.mile,
        eta_utc: checkpoint.eta_utc,
        forecast: checkpointForecasts[forecastIndex],
      })
      forecastIndex += 1
    }

    requestRoutes.push({ id: route.id, duration_s: route.duration_s, checkpoints })
  }

  return { routes: requestRoutes, weight_lb: weightLb }
}

// The trip as the app uses it: the planned trip with the recommendation, each route's risk and each checkpoint's
// weather. Both answers keep the same route and checkpoint order.
export function mergeTripRisks(plannedTrip: PlannedTrip, tripRisks: TripRisks): TripPlan {
  const routes: RoutePlan[] = []

  for (let routeIndex = 0; routeIndex < plannedTrip.routes.length; routeIndex++) {
    const plannedRoute = plannedTrip.routes[routeIndex]
    const routeRisks = tripRisks.routes[routeIndex]

    const checkpoints: Checkpoint[] = []
    for (let checkpointIndex = 0; checkpointIndex < plannedRoute.checkpoints.length; checkpointIndex++) {
      checkpoints.push({ ...plannedRoute.checkpoints[checkpointIndex], ...routeRisks.checkpoints[checkpointIndex] })
    }

    routes.push({
      id: plannedRoute.id,
      geometry: plannedRoute.geometry,
      distance_mi: plannedRoute.distance_mi,
      duration_s: plannedRoute.duration_s,
      arrival_utc: plannedRoute.arrival_utc,
      rank: routeRisks.rank,
      miles_by_level: routeRisks.miles_by_level,
      avg_risk: routeRisks.avg_risk,
      worst_level: routeRisks.worst_level,
      checkpoints,
    })
  }

  return {
    origin: plannedTrip.origin,
    destination: plannedTrip.destination,
    departure_utc: plannedTrip.departure_utc,
    notes: plannedTrip.notes,
    corridor_points: plannedTrip.corridor_points,
    corridor_cell_size_deg: plannedTrip.corridor_cell_size_deg,
    recommended_route_id: tripRisks.recommended_route_id,
    reason: tripRisks.reason,
    warning: tripRisks.warning,
    routes,
  }
}
