import type { LonLat, TripPlanRequest } from '../types/tripPlan'
import { convertDateTimeLocalToIso } from './dateTime'

// What the trip form holds when the user submits it.
export type TripFormValues = {
  origin: string
  // Coordinates of the picked suggestion; null when the text was typed.
  originPoint: LonLat | null
  destination: string
  destinationPoint: LonLat | null
  // "YYYY-MM-DDTHH:mm" in the browser's local time, from the datetime-local input.
  departureLocal: string
  spacingMi: number
  weightLb: number
}

export function buildTripPlanRequest(values: TripFormValues): TripPlanRequest {
  const request: TripPlanRequest = {
    origin: values.origin.trim(),
    destination: values.destination.trim(),
    departure: convertDateTimeLocalToIso(values.departureLocal),
    spacing_mi: values.spacingMi,
    weight_lb: values.weightLb,
  }

  // Points go along only for a picked suggestion; otherwise the backend geocodes the text.
  if (values.originPoint) {
    request.origin_point = values.originPoint
  }
  if (values.destinationPoint) {
    request.destination_point = values.destinationPoint
  }

  return request
}
