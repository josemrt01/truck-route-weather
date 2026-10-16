import type { RiskCause, RiskLevel } from './risk'

// A point as [longitude, latitude], the order GeoJSON and MapLibre use; matches the backend's LonLat.
export type LonLat = [number, number]

export type Place = {
  label: string
  lat: number
  lon: number
}

// A point along the route where the weather will be checked, with the truck's arrival time there.
export type Checkpoint = {
  mile: number
  lat: number
  lon: number
  // ISO time in UTC, e.g. "2026-10-13T13:24:00Z".
  eta_utc: string
  // Index of the last route geometry point before this checkpoint; used to cut the route line at checkpoints.
  previous_point_index: number
  // The forecast hour whose weather was used (the full hour nearest the ETA), ISO time in UTC.
  forecast_hour_utc: string
  wind_gust_mph: number
  wind_speed_mph: number
  rain_in_hr: number
  snow_in_hr: number
  level: RiskLevel
  cause: RiskCause
}

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
  weight_lb: number
}

// One route option in the plan; matches _serialize_route in the backend.
export type RoutePlan = {
  // "A", "B" or "C", from fastest to slowest.
  id: string
  // Position in the recommendation; 1 is the recommended route.
  rank: number
  geometry: LonLat[]
  distance_mi: number
  duration_s: number
  arrival_utc: string
  miles_by_level: MilesByLevel
  // Mileage-weighted average level, from 0 (all Low) to 4 (all No Travel).
  avg_risk: number
  worst_level: RiskLevel
  checkpoints: Checkpoint[]
}

// Response of POST /api/trip-plans; matches create_trip_plan in the backend.
export type TripPlan = {
  origin: Place
  destination: Place
  departure_utc: string
  recommended_route_id: string
  // One sentence on why the recommended route wins.
  reason: string
  // Shown when every route crosses No Travel conditions; null otherwise.
  warning: string | null
  // Extra information, e.g. when fewer than 3 routes were found.
  notes: string[]
  // In A, B, C order (fastest first).
  routes: RoutePlan[]
  // Grid points around all routes; sent back to /api/heatmap for the weather heatmap.
  corridor_points: LonLat[]
  // Grid cell size of those points in degrees (0.25, 0.5 or 1.0); sizes the heatmap circles.
  corridor_cell_size_deg: number
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
