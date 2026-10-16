import type { Place } from './tripPlan'

// Where one input's place search stands; used by usePlaceSuggestions and PlaceSearchInput.
export const PlaceSearchStatus = {
  // Nothing to search: too few characters, or the text is a picked suggestion.
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  FAILED: 'failed',
} as const

export type PlaceSearchStatus = (typeof PlaceSearchStatus)[keyof typeof PlaceSearchStatus]

// Suggestions for one input and the state of the search behind them.
export type PlaceSuggestions = {
  places: Place[]
  status: PlaceSearchStatus
}
