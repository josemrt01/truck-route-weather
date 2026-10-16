import type { Place } from '../types/tripPlan'

// The suggestion whose label is exactly this text, or null; picking a suggestion puts its label in the input.
// Labels are unique, because the backend lists each label once.
export function findPlaceByLabel(places: Place[], label: string): Place | null {
  for (const place of places) {
    if (place.label === label) {
      return place
    }
  }

  return null
}
