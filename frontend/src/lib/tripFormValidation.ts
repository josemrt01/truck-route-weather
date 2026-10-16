import type { FieldErrors, TripPlanField } from '../types/tripPlan'

// One required form field and the text it holds right now.
export type RequiredFieldValue = {
  field: TripPlanField
  text: string
}

// Checked before sending, so every blank field shows "Required" at once
// (the backend reports only the first problem).
export function getRequiredFieldErrors(requiredValues: RequiredFieldValue[]): FieldErrors {
  const fieldErrors: FieldErrors = {}

  for (const requiredValue of requiredValues) {
    if (requiredValue.text.trim() === '') {
      fieldErrors[requiredValue.field] = 'Required'
    }
  }

  return fieldErrors
}
