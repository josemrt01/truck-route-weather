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
}

// Body of POST /api/trip-plans; matches TripPlanRequestSerializer in the backend.
export type TripPlanRequest = {
  origin: string
  destination: string
  // ISO time with a timezone offset, e.g. "2026-10-13T13:00:00.000Z".
  departure: string
  spacing_mi: number
}

// Response of POST /api/trip-plans; matches create_trip_plan in the backend.
export type TripPlan = {
  origin: Place
  destination: Place
  departure_utc: string
  route: {
    geometry: LonLat[]
    distance_mi: number
    duration_s: number
    arrival_utc: string
    checkpoints: Checkpoint[]
  }
}

// Form fields an error can point at; values match the request field names; used by TripPlanError and the trip form.
export const TripPlanField = {
  ORIGIN: 'origin',
  DESTINATION: 'destination',
  DEPARTURE: 'departure',
  SPACING_MI: 'spacing_mi',
} as const

export type TripPlanField = (typeof TripPlanField)[keyof typeof TripPlanField]

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
