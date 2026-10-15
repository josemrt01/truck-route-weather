import type { ExpressionSpecification } from 'maplibre-gl'
import { RiskLevel } from '../types/risk'
import { RISK_LEVEL_COLORS } from './riskConfig'

// Map look (OpenFreeMap "liberty" vector style, no API key); used by MapView.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

// Starting camera, centered on the continental US; used by MapView.
export const INITIAL_MAP_VIEW = { longitude: -98.5, latitude: 39.5, zoom: 3.5 }

// Name of the route data (one line per stretch between checkpoints) inside MapLibre; used by MapView.
export const ROUTE_SEGMENT_SOURCE_ID = 'route-segments'

// Layer that draws every route stretch; clickable; used by MapView.
export const ROUTE_SEGMENT_LAYER_ID = 'route-segments-line'

// Layer that draws the hovered or selected stretch on top, thicker; used by MapView.
export const ROUTE_SEGMENT_HIGHLIGHT_LAYER_ID = 'route-segment-highlight'

// Name of the heatmap grid points inside MapLibre; used by MapView.
export const HEATMAP_SOURCE_ID = 'heatmap-points'

// Layer that draws each heatmap point as a soft circle in its risk color, under the routes; used by MapView.
export const HEATMAP_LAYER_ID = 'heatmap-circles'

// Heatmap circle radius as a share of a grid cell's width; above 1 so the blurred edges of neighbors overlap
// and blend into one area instead of separate dots; used by getHeatmapRadiusAtZoom0.
export const HEATMAP_CELL_COVERAGE = 1.25

// Heatmap circle opacity; low enough that the map and routes stay readable underneath; used by MapView.
export const HEATMAP_OPACITY = 0.45

// Name of the unselected route lines inside MapLibre; used by MapView.
export const OTHER_ROUTES_SOURCE_ID = 'other-routes'

// Layer that draws the unselected routes as thin gray lines under the selected route; used by MapView.
export const OTHER_ROUTES_LAYER_ID = 'other-routes-line'

// Color of the unselected routes, a neutral gray apart from the risk colors; used by MapView.
export const OTHER_ROUTE_COLOR = '#6e7781'

// Thickness in pixels of the unselected routes, thinner than the selected one; used by MapView.
export const OTHER_ROUTE_WIDTH = 4

// Name of the checkpoint points inside MapLibre; used by MapView.
export const CHECKPOINT_SOURCE_ID = 'checkpoints'

// Layer that draws a small dot at each checkpoint; used by MapView.
export const CHECKPOINT_LAYER_ID = 'checkpoint-dots'

// Layer that draws a dark outline under the route; used by MapView.
export const ROUTE_CASING_LAYER_ID = 'route-casing'

// Color of the line for a level the frontend doesn't know (shouldn't happen); used by ROUTE_SEGMENT_COLOR_EXPRESSION.
const UNKNOWN_LEVEL_COLOR = '#8c959f'

// MapLibre picks each segment's color from its "level" property, like a switch statement with a default;
// used by MapView for the route and the highlight.
export const ROUTE_SEGMENT_COLOR_EXPRESSION: ExpressionSpecification = [
  'match',
  ['get', 'level'],
  RiskLevel.LOW,
  RISK_LEVEL_COLORS[RiskLevel.LOW],
  RiskLevel.MODERATE,
  RISK_LEVEL_COLORS[RiskLevel.MODERATE],
  RiskLevel.HIGH,
  RISK_LEVEL_COLORS[RiskLevel.HIGH],
  RiskLevel.SEVERE,
  RISK_LEVEL_COLORS[RiskLevel.SEVERE],
  RiskLevel.NO_TRAVEL,
  RISK_LEVEL_COLORS[RiskLevel.NO_TRAVEL],
  UNKNOWN_LEVEL_COLOR,
]

// Dark outline color under the route, so yellow and green stand out on the light map; used by MapView.
export const ROUTE_CASING_COLOR = '#1f2328'

// Outline thickness in pixels; wider than ROUTE_LINE_WIDTH so a thin dark border shows on each side; used by MapView.
export const ROUTE_CASING_WIDTH = 8

// Route line thickness in pixels; used by MapView.
export const ROUTE_LINE_WIDTH = 5

// Thickness in pixels of the hovered or selected route stretch, drawn in its own risk color; used by MapView.
export const ROUTE_SEGMENT_HIGHLIGHT_WIDTH = 9

// Checkpoint dot color, white so it shows on any route color; used by MapView.
export const CHECKPOINT_DOT_COLOR = '#ffffff'

// Checkpoint dot radius in pixels, small enough to sit inside the route line; used by MapView.
export const CHECKPOINT_DOT_RADIUS = 3

// Pixels between a clicked point and the popup above it; used by MapView.
export const SEGMENT_POPUP_OFFSET = 10

// Milliseconds the camera takes to fly to a new route; used by MapView.
export const FIT_ANIMATION_MS = 1000

// Screens narrower than 768px, below Tailwind's md breakpoint; used by MapView to pick the fit padding.
export const NARROW_SCREEN_QUERY = '(max-width: 767px)'

// Pixels kept around the route when zooming to it, so the start and end pins aren't at the edge;
// left clears the side panel (12px gap + 320px panel), bottom clears the forecast slider; used by MapView.
export const ROUTE_FIT_PADDING = { top: 100, right: 100, bottom: 180, left: 432 }

// Same as ROUTE_FIT_PADDING on narrow screens, where the panel sits above the map; used by MapView.
export const ROUTE_FIT_PADDING_NARROW = { top: 60, right: 40, bottom: 180, left: 40 }

// Closest zoom when fitting a route, so short trips keep their surroundings in view; used by MapView.
export const MAX_ROUTE_FIT_ZOOM = 9

// Start pin color (dark slate, apart from the risk colors); used by RouteEndpointMarker.
export const START_MARKER_COLOR = '#1f2328'

// End pin color (blue, apart from the risk colors); used by RouteEndpointMarker.
export const END_MARKER_COLOR = '#0969da'
