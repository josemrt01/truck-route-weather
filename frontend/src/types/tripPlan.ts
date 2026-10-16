import type { OpenMeteoHourly } from './openMeteo'
import type { RiskCause, RiskLevel } from './risk'

// A point as [longitude, latitude], the order GeoJSON and MapLibre use; matches the backend's LonLat.
export type LonLat = [number, number]

export type Place = {
  label: string
  lat: number
  lon: number
}

// A point along the route where the weather is checked, with the truck's arrival time there;
// part of the POST /api/trip-plans answer.
export type CheckpointPosition = {
  mile: number
  lat: number
  lon: number
  // ISO time in UTC, e.g. "2026-10-13T13:24:00Z".
  eta_utc: string
  // Index of the last route geometry point before this checkpoint; used to cut the route line at checkpoints.
  previous_point_index: number
}

// The weather the truck meets at a checkpoint and its risk; part of the POST /api/trip-risks answer.
export type CheckpointRisk = {
  // The forecast hour whose weather was used (the full hour nearest the ETA), ISO time in UTC.
  forecast_hour_utc: string
  wind_gust_mph: number
  wind_speed_mph: number
  rain_in_hr: number
  snow_in_hr: number
  level: RiskLevel
  cause: RiskCause
}

// A checkpoint as the app uses it: its position and its risk together.
export type Checkpoint = CheckpointPosition & CheckpointRisk

// Miles driven at each risk level; keys match RiskLevel names in the backend, lowercased.
export type MilesByLevel = {
  low: number
  moderate: number
  high: number
  severe: number
  no_travel: number
}

// Body of POST /api/trip-plans; matches TripPlanRequestSerializer in the backend.
export type TripPlanRequest = {
  origin: string
  // Sent only for a picked suggestion; the backend then skips geocoding the origin text.
  origin_point?: LonLat
  destination: string
  // Same as origin_point, for the destination.
  destination_point?: LonLat
  // ISO time with a timezone offset, e.g. "2026-10-13T13:00:00.000Z".
  departure: string
  spacing_mi: number
}

// One route of the POST /api/trip-plans answer, without weather; matches _serialize_route in trip_plan_service.
export type PlannedRoute = {
  // "A", "B" or "C", from fastest to slowest; used to select routes, never shown.
  id: string
  geometry: LonLat[]
  distance_mi: number
  duration_s: number
  arrival_utc: string
  checkpoints: CheckpointPosition[]
}

// Answer of POST /api/trip-plans: places, routes and checkpoints, no weather yet; matches create_trip_plan.
export type PlannedTrip = {
  origin: Place
  destination: Place
  departure_utc: string
  // Extra information, e.g. when fewer than 3 routes were found.
  notes: string[]
  // In A, B, C order (fastest first).
  routes: PlannedRoute[]
  // Grid points around all routes; their forecasts go to /api/heatmap for the weather heatmap.
  corridor_points: LonLat[]
  // Grid cell size of those points in degrees (0.25, 0.5 or 1.0); sizes the heatmap circles.
  corridor_cell_size_deg: number
}

// One checkpoint sent to POST /api/trip-risks, with the forecast the browser got for it.
export type RiskCheckpointRequest = {
  mile: number
  eta_utc: string
  forecast: OpenMeteoHourly
}

// Body of POST /api/trip-risks; matches TripRisksRequestSerializer in the backend.
export type TripRisksRequest = {
  routes: {
    id: string
    duration_s: number
    checkpoints: RiskCheckpointRequest[]
  }[]
  weight_lb: number
}

// One route of the POST /api/trip-risks answer; matches _serialize_route in trip_risk_service.
export type RouteRisks = {
  id: string
  // Position in the recommendation; 1 is the recommended route.
  rank: number
  miles_by_level: MilesByLevel
  // Mileage-weighted average level, from 0 (all Low) to 4 (all No Travel).
  avg_risk: number
  worst_level: RiskLevel
  // Same order as the checkpoints that were sent.
  checkpoints: CheckpointRisk[]
}

// Answer of POST /api/trip-risks; matches create_trip_risks in the backend.
export type TripRisks = {
  recommended_route_id: string
  // One sentence on why the recommended route wins.
  reason: string
  // Shown when every route crosses No Travel conditions; null otherwise.
  warning: string | null
  // Same order as the routes that were sent.
  routes: RouteRisks[]
}

// One route option as the app uses it: the planned route with its risk.
export type RoutePlan = Omit<PlannedRoute, 'checkpoints'> &
  Omit<RouteRisks, 'id' | 'checkpoints'> & {
    checkpoints: Checkpoint[]
  }

// The whole trip as the app uses it: the planned trip with the recommendation and every route's risk.
export type TripPlan = Omit<PlannedTrip, 'routes'> &
  Omit<TripRisks, 'routes'> & {
    routes: RoutePlan[]
  }

// Truck settings the form sent with a plan; the response doesn't repeat them, so App keeps them
// for the heatmap request and the trip summary.
export type TripSettings = {
  weightLb: number
  spacingMi: number
}

// Form fields an error can point at; values match the request field names; used by TripPlanError and the trip form.
export const TripPlanField = {
  ORIGIN: 'origin',
  DESTINATION: 'destination',
  // A bad picked point; its error shows under the origin input.
  ORIGIN_POINT: 'origin_point',
  // A bad picked point; its error shows under the destination input.
  DESTINATION_POINT: 'destination_point',
  DEPARTURE: 'departure',
  SPACING_MI: 'spacing_mi',
  WEIGHT_LB: 'weight_lb',
} as const

export type TripPlanField = (typeof TripPlanField)[keyof typeof TripPlanField]

// Error message per form field; a field without a key has no error; used by the trip form.
export type FieldErrors = Partial<Record<TripPlanField, string>>

// Error body the backend sends; built by exception_handler.py.
export type ApiErrorResponse = {
  error: string
  field: TripPlanField | null
}

// Thrown by getTripPlan; field says which input to show the message under (null = general error).
export class TripPlanError extends Error {
  field: TripPlanField | null

  constructor(message: string, field: TripPlanField | null) {
    super(message)
    this.name = 'TripPlanError'
    this.field = field
  }
}
