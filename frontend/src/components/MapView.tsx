import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, NavigationControl, Popup, Source, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  CHECKPOINT_DOT_COLOR,
  CHECKPOINT_DOT_RADIUS,
  CHECKPOINT_LAYER_ID,
  CHECKPOINT_SOURCE_ID,
  FIT_ANIMATION_MS,
  INITIAL_MAP_VIEW,
  MAP_STYLE_URL,
  MAX_ROUTE_FIT_ZOOM,
  NARROW_SCREEN_QUERY,
  ROUTE_FIT_PADDING,
  ROUTE_FIT_PADDING_NARROW,
  ROUTE_LINE_COLOR,
  ROUTE_LINE_WIDTH,
  ROUTE_SEGMENT_HIGHLIGHT_COLOR,
  ROUTE_SEGMENT_HIGHLIGHT_LAYER_ID,
  ROUTE_SEGMENT_HIGHLIGHT_WIDTH,
  ROUTE_SEGMENT_LAYER_ID,
  ROUTE_SEGMENT_SOURCE_ID,
  SEGMENT_POPUP_OFFSET,
} from '../config/mapConfig'
import { formatEta } from '../lib/formatters'
import { buildCheckpointPoints, buildRouteSegments, getRouteBounds } from '../lib/routeGeometry'
import { RouteEndpoint } from '../types/routeEndpoint'
import type { TripPlan } from '../types/tripPlan'
import { RouteEndpointMarker } from './RouteEndpointMarker'
// Runs once to tell MapLibre where its worker file is; must load before any map is created.
import '../lib/maplibreWorker'

// Highlight filter value that matches no stretch; stretch indexes start at 0.
const NO_SEGMENT_INDEX = -1

// Only the route stretches react to the mouse; MapLibre reports which one was hit.
const INTERACTIVE_LAYER_IDS = [ROUTE_SEGMENT_LAYER_ID]

// A clicked route stretch and where the click was, so the popup opens there.
type SelectedSegment = {
  // The plan this stretch belongs to; a new plan hides the popup of the old one.
  tripPlan: TripPlan
  index: number
  lon: number
  lat: number
}

type MapViewProps = {
  // The planned trip to draw; null before the first plan.
  tripPlan: TripPlan | null
}

export function MapView({ tripPlan }: MapViewProps) {
  // Handle to the MapLibre map, so we can move its camera.
  const mapRef = useRef<MapRef>(null)
  const [hoveredSegmentIndex, setHoveredSegmentIndex] = useState<number | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<SelectedSegment | null>(null)

  // Rebuild the map data only when the plan changes, not on every render.
  const routeSegments = useMemo(
    () => (tripPlan ? buildRouteSegments(tripPlan.route.geometry, tripPlan.route.checkpoints) : null),
    [tripPlan],
  )
  const checkpointPoints = useMemo(
    () => (tripPlan ? buildCheckpointPoints(tripPlan.route.checkpoints) : null),
    [tripPlan],
  )

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

  // A popup left over from an older plan is hidden instead of reset, so no effect is needed.
  const visibleSegment = selectedSegment?.tripPlan === tripPlan ? selectedSegment : null
  const highlightedSegmentIndex = hoveredSegmentIndex ?? visibleSegment?.index ?? NO_SEGMENT_INDEX

  function handleMouseMove(event: MapLayerMouseEvent) {
    // features holds the stretch under the mouse (only INTERACTIVE_LAYER_IDS are checked), or nothing.
    const segmentIndex = event.features?.[0]?.properties?.index
    setHoveredSegmentIndex(typeof segmentIndex === 'number' ? segmentIndex : null)
  }

  function handleClick(event: MapLayerMouseEvent) {
    const segmentIndex = event.features?.[0]?.properties?.index

    // A click on empty map closes the popup.
    if (!tripPlan || typeof segmentIndex !== 'number') {
      setSelectedSegment(null)
      return
    }

    setSelectedSegment({ tripPlan, index: segmentIndex, lon: event.lngLat.lng, lat: event.lngLat.lat })
  }

  // The two checkpoints at the ends of the clicked stretch.
  const segmentStart = visibleSegment ? visibleSegment.tripPlan.route.checkpoints[visibleSegment.index] : null
  const segmentEnd = visibleSegment ? visibleSegment.tripPlan.route.checkpoints[visibleSegment.index + 1] : null

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_MAP_VIEW}
      mapStyle={MAP_STYLE_URL}
      style={{ width: '100%', height: '100%' }}
      interactiveLayerIds={INTERACTIVE_LAYER_IDS}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredSegmentIndex(null)}
      onClick={handleClick}
      // Pointer over a stretch tells the user it can be clicked.
      cursor={hoveredSegmentIndex !== null ? 'pointer' : 'grab'}
    >
      {/* Zoom +/- buttons and compass. */}
      <NavigationControl position="top-right" />

      {/* Layers draw in the order listed: stretches, then the highlight, then the dots on top. */}
      {routeSegments && (
        <Source id={ROUTE_SEGMENT_SOURCE_ID} type="geojson" data={routeSegments}>
          <Layer
            id={ROUTE_SEGMENT_LAYER_ID}
            type="line"
            // Round joins and caps keep corners and stretch ends smooth.
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': ROUTE_LINE_COLOR, 'line-width': ROUTE_LINE_WIDTH }}
          />
          <Layer
            id={ROUTE_SEGMENT_HIGHLIGHT_LAYER_ID}
            type="line"
            // Draw only the stretch whose index matches the hovered or selected one.
            filter={['==', ['get', 'index'], highlightedSegmentIndex]}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': ROUTE_SEGMENT_HIGHLIGHT_COLOR, 'line-width': ROUTE_SEGMENT_HIGHLIGHT_WIDTH }}
          />
        </Source>
      )}

      {checkpointPoints && (
        <Source id={CHECKPOINT_SOURCE_ID} type="geojson" data={checkpointPoints}>
          <Layer
            id={CHECKPOINT_LAYER_ID}
            type="circle"
            paint={{ 'circle-color': CHECKPOINT_DOT_COLOR, 'circle-radius': CHECKPOINT_DOT_RADIUS }}
          />
        </Source>
      )}

      {/* Start (A) and end (B) pins, drawn above the route. */}
      {tripPlan && (
        <>
          <RouteEndpointMarker place={tripPlan.origin} endpoint={RouteEndpoint.START} />
          <RouteEndpointMarker place={tripPlan.destination} endpoint={RouteEndpoint.END} />
        </>
      )}

      {/* Basic info for the clicked stretch; slice 4 adds the weather. */}
      {visibleSegment && segmentStart && segmentEnd && (
        <Popup
          longitude={visibleSegment.lon}
          latitude={visibleSegment.lat}
          anchor="bottom"
          offset={SEGMENT_POPUP_OFFSET}
          // Our own onClick already closes it on empty-map clicks.
          closeOnClick={false}
          onClose={() => setSelectedSegment(null)}
        >
          <div className="flex flex-col text-sm">
            <strong>
              Miles {segmentStart.mile}–{segmentEnd.mile}
            </strong>
            <span>
              {formatEta(segmentStart.eta_utc)} – {formatEta(segmentEnd.eta_utc)}
            </span>
          </div>
        </Popup>
      )}
    </Map>
  )
}
