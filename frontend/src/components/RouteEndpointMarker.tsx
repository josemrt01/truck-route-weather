import { Marker } from 'react-map-gl/maplibre'
import { RouteEndpoint } from '../types/routeEndpoint'
import type { Place } from '../types/tripPlan'

// Screen-reader and hover name for each end of the route.
const ENDPOINT_NAMES = {
  [RouteEndpoint.START]: 'Start',
  [RouteEndpoint.END]: 'Destination',
}

type RouteEndpointMarkerProps = {
  place: Place
  endpoint: RouteEndpoint
}

// The ends of the route: a white dot with a dark ring at the start,
// a red pin at the destination; both with a soft shadow and no letters.
export function RouteEndpointMarker({ place, endpoint }: RouteEndpointMarkerProps) {
  const name = ENDPOINT_NAMES[endpoint]
  const description = `${name}: ${place.label}`

  if (endpoint === RouteEndpoint.START) {
    return (
      // anchor="center" puts the middle of the dot on the place.
      <Marker longitude={place.lon} latitude={place.lat} anchor="center">
        <div
          className="size-4 cursor-default rounded-full border-[3px] border-foreground bg-surface drop-shadow-map-pin"
          title={description}
          role="img"
          aria-label={description}
        />
      </Marker>
    )
  }

  return (
    // anchor="bottom" puts the pin's tip, not its center, on the place.
    <Marker longitude={place.lon} latitude={place.lat} anchor="bottom">
      {/* text-error colors the pin through fill="currentColor", the same red as the pin in the trip summary. */}
      <div
        className="flex cursor-default text-error drop-shadow-map-pin"
        title={description}
        role="img"
        aria-label={description}
      >
        <svg width="30" height="40" viewBox="-1 -1 30 40" aria-hidden="true">
          {/* Teardrop pin with a white outline, so it stands out on any map color, and a white dot inside. */}
          <path
            d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z"
            fill="currentColor"
            stroke="white"
            strokeWidth="2"
          />
          <circle cx="14" cy="14" r="5" fill="white" />
        </svg>
      </div>
    </Marker>
  )
}
