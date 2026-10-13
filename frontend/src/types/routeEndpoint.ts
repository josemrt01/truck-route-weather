// The two ends of a route; used by RouteEndpointMarker and MapView.
export const RouteEndpoint = {
  START: 'start',
  END: 'end',
} as const

export type RouteEndpoint = (typeof RouteEndpoint)[keyof typeof RouteEndpoint]
