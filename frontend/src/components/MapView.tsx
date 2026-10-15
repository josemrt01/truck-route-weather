import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, NavigationControl, Popup, Source, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre'
import { LngLatBounds } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  CHECKPOINT_DOT_COLOR,
  CHECKPOINT_DOT_RADIUS,
  CHECKPOINT_LAYER_ID,
  CHECKPOINT_SOURCE_ID,
  FIT_ANIMATION_MS,
  HEATMAP_LAYER_ID,
  HEATMAP_OPACITY,
  HEATMAP_SOURCE_ID,
  INITIAL_MAP_VIEW,
  MAP_STYLE_URL,
  MAX_ROUTE_FIT_ZOOM,
  NARROW_SCREEN_QUERY,
  OTHER_ROUTE_COLOR,
  OTHER_ROUTE_WIDTH,
  OTHER_ROUTES_LAYER_ID,
  OTHER_ROUTES_SOURCE_ID,
  ROUTE_FIT_PADDING,
  ROUTE_CASING_COLOR,
  ROUTE_CASING_LAYER_ID,
  ROUTE_CASING_WIDTH,
  ROUTE_FIT_PADDING_NARROW,
  ROUTE_LINE_WIDTH,
  ROUTE_SEGMENT_COLOR_EXPRESSION,
  ROUTE_SEGMENT_HIGHLIGHT_LAYER_ID,
  ROUTE_SEGMENT_HIGHLIGHT_WIDTH,
  ROUTE_SEGMENT_LAYER_ID,
  ROUTE_SEGMENT_SOURCE_ID,
  SEGMENT_POPUP_OFFSET,
} from '../config/mapConfig'
import { buildHeatmapPoints, getHeatmapColorExpression, getHeatmapRadiusExpression } from '../lib/heatmapGeometry'
import { buildCheckpointPoints, buildOtherRouteLines, buildRouteSegments } from '../lib/routeGeometry'
import { getRouteById } from '../lib/tripPlanRoutes'
import { RouteEndpoint } from '../types/routeEndpoint'
import type { Heatmap } from '../types/heatmap'
import type { TripPlan } from '../types/tripPlan'
import { RouteEndpointMarker } from './RouteEndpointMarker'
import { SegmentDetails } from './SegmentDetails'
// Runs once to tell MapLibre where its worker file is; must load before any map is created.
import '../lib/maplibreWorker'

// Highlight filter value that matches no stretch; stretch indexes start at 0.
const NO_SEGMENT_INDEX = -1

// Only the route stretches react to the mouse; MapLibre reports which one was hit.
const INTERACTIVE_LAYER_IDS = [ROUTE_SEGMENT_LAYER_ID]

// A clicked route stretch and where the click was, so the popup opens there.
type SelectedSegment = {
  // The plan and route this stretch belongs to; a new plan or another selected route hides the popup.
  tripPlan: TripPlan
  routeId: string
  index: number
  lon: number
  lat: number
}

type MapViewProps = {
  // The planned trip to draw; null before the first plan.
  tripPlan: TripPlan | null
  // The route drawn with risk colors ("A", "B" or "C"); the others are drawn gray.
  selectedRouteId: string | null
  // Weather risk around the routes; null while loading, on failure, or before the first plan.
  heatmap: Heatmap | null
  // Forecast hour the heatmap shows: 0 = now, up to 48; set by the forecast slider.
  forecastHour: number
}

export function MapView({ tripPlan, selectedRouteId, heatmap, forecastHour }: MapViewProps) {
  // Handle to the MapLibre map, so we can move its camera.
  const mapRef = useRef<MapRef>(null)
  const [hoveredSegmentIndex, setHoveredSegmentIndex] = useState<number | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<SelectedSegment | null>(null)

  const selectedRoute = tripPlan && selectedRouteId ? getRouteById(tripPlan, selectedRouteId) : null

  // Rebuild the map data only when the route changes, not on every render.
  const routeSegments = useMemo(
    () => (selectedRoute ? buildRouteSegments(selectedRoute.geometry, selectedRoute.checkpoints) : null),
    [selectedRoute],
  )
  const checkpointPoints = useMemo(
    () => (selectedRoute ? buildCheckpointPoints(selectedRoute.checkpoints) : null),
    [selectedRoute],
  )
  const heatmapPoints = useMemo(() => (heatmap ? buildHeatmapPoints(heatmap) : null), [heatmap])
  const otherRouteLines = useMemo(
    () => (tripPlan && selectedRouteId ? buildOtherRouteLines(tripPlan.routes, selectedRouteId) : null),
    [tripPlan, selectedRouteId],
  )

  // Fly the camera so every route of a new plan is visible; selecting another route doesn't move it.
  useEffect(() => {
    if (!tripPlan || !mapRef.current) return

    // On narrow screens the panel sits above the map, so the route needs no extra space on the left.
    const isNarrowScreen = window.matchMedia(NARROW_SCREEN_QUERY).matches
    const padding = isNarrowScreen ? ROUTE_FIT_PADDING_NARROW : ROUTE_FIT_PADDING

    // Start a box at the first point, then grow it until it contains every point of every route.
    const firstPoint = tripPlan.routes[0].geometry[0]
    const allRoutesBounds = new LngLatBounds(firstPoint, firstPoint)
    for (const route of tripPlan.routes) {
      for (const point of route.geometry) {
        allRoutesBounds.extend(point)
      }
    }

    mapRef.current.fitBounds(allRoutesBounds, {
      padding,
      maxZoom: MAX_ROUTE_FIT_ZOOM,
      duration: FIT_ANIMATION_MS,
    })
  }, [tripPlan])

  // A popup left over from an older plan or another route is hidden instead of reset, so no effect is needed.
  const visibleSegment =
    selectedSegment?.tripPlan === tripPlan && selectedSegment.routeId === selectedRouteId ? selectedSegment : null
  const highlightedSegmentIndex = hoveredSegmentIndex ?? visibleSegment?.index ?? NO_SEGMENT_INDEX

  function handleMouseMove(event: MapLayerMouseEvent) {
    // features holds the stretch under the mouse (only INTERACTIVE_LAYER_IDS are checked), or nothing.
    const segmentIndex = event.features?.[0]?.properties?.index
    setHoveredSegmentIndex(typeof segmentIndex === 'number' ? segmentIndex : null)
  }

  function handleClick(event: MapLayerMouseEvent) {
    const segmentIndex = event.features?.[0]?.properties?.index

    // A click on empty map closes the popup.
    if (!tripPlan || !selectedRouteId || typeof segmentIndex !== 'number') {
      setSelectedSegment(null)
      return
    }

    setSelectedSegment({
      tripPlan,
      routeId: selectedRouteId,
      index: segmentIndex,
      lon: event.lngLat.lng,
      lat: event.lngLat.lat,
    })
  }

  // The two checkpoints at the ends of the clicked stretch.
  const segmentStart = visibleSegment && selectedRoute ? selectedRoute.checkpoints[visibleSegment.index] : null
  const segmentEnd = visibleSegment && selectedRoute ? selectedRoute.checkpoints[visibleSegment.index + 1] : null

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

      {/* Layers draw in the order listed: gray other routes, then the selected route's dark outline,
          risk-colored stretches and highlight, then the dots on top. */}
      {/* Weather heatmap at the bottom: each grid point a soft circle in its risk color (Low is transparent). */}
      {heatmapPoints && tripPlan && (
        <Source id={HEATMAP_SOURCE_ID} type="geojson" data={heatmapPoints}>
          <Layer
            id={HEATMAP_LAYER_ID}
            type="circle"
            paint={{
              // Only this rule changes when the slider moves; the points themselves stay loaded.
              'circle-color': getHeatmapColorExpression(forecastHour),
              'circle-radius': getHeatmapRadiusExpression(tripPlan.corridor_cell_size_deg),
              // Soft edges, so neighboring circles blend into one colored area.
              'circle-blur': 1,
              'circle-opacity': HEATMAP_OPACITY,
            }}
          />
        </Source>
      )}

      {otherRouteLines && (
        <Source id={OTHER_ROUTES_SOURCE_ID} type="geojson" data={otherRouteLines}>
          <Layer
            id={OTHER_ROUTES_LAYER_ID}
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': OTHER_ROUTE_COLOR, 'line-width': OTHER_ROUTE_WIDTH }}
          />
        </Source>
      )}

      {routeSegments && (
        <Source id={ROUTE_SEGMENT_SOURCE_ID} type="geojson" data={routeSegments}>
          <Layer
            id={ROUTE_CASING_LAYER_ID}
            type="line"
            // Round joins and caps keep corners and stretch ends smooth.
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': ROUTE_CASING_COLOR, 'line-width': ROUTE_CASING_WIDTH }}
          />
          <Layer
            id={ROUTE_SEGMENT_LAYER_ID}
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            // Each stretch takes the color of its risk level.
            paint={{ 'line-color': ROUTE_SEGMENT_COLOR_EXPRESSION, 'line-width': ROUTE_LINE_WIDTH }}
          />
          <Layer
            id={ROUTE_SEGMENT_HIGHLIGHT_LAYER_ID}
            type="line"
            // Draw only the stretch whose index matches the hovered or selected one, thicker in its own color.
            filter={['==', ['get', 'index'], highlightedSegmentIndex]}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': ROUTE_SEGMENT_COLOR_EXPRESSION, 'line-width': ROUTE_SEGMENT_HIGHLIGHT_WIDTH }}
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

      {/* Miles, times, risk and weather for the clicked stretch. */}
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
          <SegmentDetails start={segmentStart} end={segmentEnd} />
        </Popup>
      )}

    </Map>
  )
}
