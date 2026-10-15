import type { LonLat } from './tripPlan'

// Where the truck is in its trip at the slider's time; used by getTruckPosition and TruckMarker.
export const TruckStatus = {
  NOT_DEPARTED: 'not_departed',
  ON_THE_WAY: 'on_the_way',
  ARRIVED: 'arrived',
} as const

export type TruckStatus = (typeof TruckStatus)[keyof typeof TruckStatus]

// The truck's place on the map and its trip status.
export type TruckPosition = {
  lonLat: LonLat
  status: TruckStatus
}
