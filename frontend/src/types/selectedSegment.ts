import type { TripPlan } from './tripPlan'

// Where a route segment was clicked: its index and the click's position, where the popup opens; sent by MapView.
export type SegmentClick = {
  index: number
  lon: number
  lat: number
}

// The clicked segment as App keeps it, with the plan and route it belongs to; a new plan or another selected
// route hides it.
export type SelectedSegment = SegmentClick & {
  tripPlan: TripPlan
  routeId: string
}
