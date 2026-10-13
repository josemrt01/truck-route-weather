import { useEffect, useMemo, useRef } from 'react'
import Map, { Layer, NavigationControl, Source, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  FIT_ANIMATION_MS,
  INITIAL_MAP_VIEW,
  MAP_STYLE_URL,
  MAX_ROUTE_FIT_ZOOM,
  NARROW_SCREEN_QUERY,
  ROUTE_FIT_PADDING,
  ROUTE_FIT_PADDING_NARROW,
  ROUTE_LAYER_ID,
  ROUTE_LINE_COLOR,
  ROUTE_LINE_WIDTH,
  ROUTE_SOURCE_ID,
} from '../config/mapConfig'
import { buildRouteFeature, getRouteBounds } from '../lib/routeGeometry'
import { RouteEndpoint } from '../types/routeEndpoint'
import type { TripPlan } from '../types/tripPlan'
import { RouteEndpointMarker } from './RouteEndpointMarker'
// Runs once to tell MapLibre where its worker file is; must load before any map is created.
import '../lib/maplibreWorker'

type MapViewProps = {
  // The planned trip to draw; null before the first plan.
  tripPlan: TripPlan | null
}

export function MapView({ tripPlan }: MapViewProps) {
  // Handle to the MapLibre map, so we can move its camera.
  const mapRef = useRef<MapRef>(null)

  // Rebuild the route line only when the plan changes, not on every render.
  const routeFeature = useMemo(() => (tripPlan ? buildRouteFeature(tripPlan.route.geometry) : null), [tripPlan])

  // Fly the camera so the whole new route is visible.
  useEffect(() => {
    if (!tripPlan || !mapRef.current) return

    // On narrow screens the panel sits above the map, so the route needs no extra space on the left.
    const isNarrowScreen = window.matchMedia(NARROW_SCREEN_QUERY).matches
    const padding = isNarrowScreen ? ROUTE_FIT_PADDING_NARROW : ROUTE_FIT_PADDING

    mapRef.current.fitBounds(getRouteBounds(tripPlan.route.geometry), {
      padding,
      maxZoom: MAX_ROUTE_FIT_ZOOM,
      duration: FIT_ANIMATION_MS,
    })
  }, [tripPlan])

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_MAP_VIEW}
      mapStyle={MAP_STYLE_URL}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Zoom +/- buttons and compass. */}
      <NavigationControl position="top-right" />

      {routeFeature && (
        <Source id={ROUTE_SOURCE_ID} type="geojson" data={routeFeature}>
          <Layer
            id={ROUTE_LAYER_ID}
            type="line"
            // Round joins and caps keep corners and line ends smooth.
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': ROUTE_LINE_COLOR, 'line-width': ROUTE_LINE_WIDTH }}
          />
        </Source>
      )}

      {/* Start (A) and end (B) pins, drawn above the route line. */}
      {tripPlan && (
        <>
          <RouteEndpointMarker place={tripPlan.origin} endpoint={RouteEndpoint.START} />
          <RouteEndpointMarker place={tripPlan.destination} endpoint={RouteEndpoint.END} />
        </>
      )}
    </Map>
  )
}
