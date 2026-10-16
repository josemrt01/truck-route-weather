import { TripPlanField, type FieldErrors } from '../types/tripPlan'

// Checked before sending, so every blank place shows its message at once
// (the backend reports only the first problem).
export function getMissingPlaceErrors(origin: string, destination: string): FieldErrors {
  const fieldErrors: FieldErrors = {}

  if (origin.trim() === '') {
    fieldErrors[TripPlanField.ORIGIN] = 'Enter an origin.'
  }
  if (destination.trim() === '') {
    fieldErrors[TripPlanField.DESTINATION] = 'Enter a destination.'
  }

  return fieldErrors
}
