// A point as [longitude, latitude], the order GeoJSON and MapLibre use; matches the backend's LonLat.
export type LonLat = [number, number]

export type Place = {
  label: string
  lat: number
  lon: number
}

// Response of POST /api/trip-plans; matches create_trip_plan in the backend.
export type TripPlan = {
  origin: Place
  destination: Place
  route: {
    geometry: LonLat[]
    distance_mi: number
    duration_s: number
  }
}

// Form fields an error can point at; used by TripPlanError and the trip form.
export const TripPlanField = {
  ORIGIN: 'origin',
  DESTINATION: 'destination',
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
