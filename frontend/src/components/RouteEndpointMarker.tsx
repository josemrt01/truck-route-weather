import { Marker } from 'react-map-gl/maplibre'
import { END_MARKER_COLOR, START_MARKER_COLOR } from '../config/mapConfig'
import { RouteEndpoint } from '../types/routeEndpoint'
import type { Place } from '../types/tripPlan'

// Letter, color and screen-reader name for each end of the route.
const ENDPOINT_STYLES = {
  [RouteEndpoint.START]: { letter: 'A', color: START_MARKER_COLOR, name: 'Start' },
  [RouteEndpoint.END]: { letter: 'B', color: END_MARKER_COLOR, name: 'End' },
}

type RouteEndpointMarkerProps = {
  place: Place
  endpoint: RouteEndpoint
}

export function RouteEndpointMarker({ place, endpoint }: RouteEndpointMarkerProps) {
  const { letter, color, name } = ENDPOINT_STYLES[endpoint]

  return (
    // anchor="bottom" puts the pin's tip, not its center, on the place.
    <Marker longitude={place.lon} latitude={place.lat} anchor="bottom">
      {/* title shows the place name on hover. */}
      <div
        className="route-endpoint-marker"
        title={`${name}: ${place.label}`}
        role="img"
        aria-label={`${name}: ${place.label}`}
      >
        <svg width="30" height="40" viewBox="-1 -1 30 40" aria-hidden="true">
          {/* Teardrop pin shape with a white outline so it stands out on any map color. */}
          <path
            d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z"
            fill={color}
            stroke="white"
            strokeWidth="2"
          />
          <text x="14" y="14" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fill="white">
            {letter}
          </text>
        </svg>
      </div>
    </Marker>
  )
}
