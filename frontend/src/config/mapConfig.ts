import type { ExpressionSpecification } from 'maplibre-gl'
import { RiskLevel } from '../types/risk'
import { RISK_LEVEL_COLORS } from './riskConfig'

// Map look (OpenFreeMap "liberty" vector style, no API key); used by MapView.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

// First label layer (river names) of the map style, above its roads, bridges and buildings; our layers go under it,
// so place and road names stay readable on top of the route; used by MapView.
export const MAP_LABEL_LAYER_ID = 'waterway_line_label'

// Zoom levels and width multipliers for lines and dots that grow as the map zooms in: thinner zoomed out,
// the base width at a whole-route view, and much wider at street level; used by getZoomScaledWidth.
const ZOOMED_OUT_ZOOM = 5
const ZOOMED_OUT_WIDTH_FACTOR = 0.6
const BASE_WIDTH_ZOOM = 9
const STREET_ZOOM = 15
const STREET_WIDTH_FACTOR = 2.4

// Width rule that grows a pixel width with the zoom (base width at zoom 9), so the route reads like a road
// at every zoom; used for the route, outline, highlight, other routes and checkpoint dots.
function getZoomScaledWidth(baseWidthPx: number): ExpressionSpecification {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    ZOOMED_OUT_ZOOM,
    baseWidthPx * ZOOMED_OUT_WIDTH_FACTOR,
    BASE_WIDTH_ZOOM,
    baseWidthPx,
    STREET_ZOOM,
    baseWidthPx * STREET_WIDTH_FACTOR,
  ]
}

// The lower 48 states as [[west, south], [east, north]]; the starting camera fits them; used by MapView.
export const CONTIGUOUS_US_BOUNDS: [[number, number], [number, number]] = [
  [-124.8, 24.4],
  [-66.9, 49.4],
]

// Pixels kept around the US on the first view; left clears the side panel (448px, lg:w-[28rem] in App)
// so the country is centered in the part of the map you can see; used by MapView.
export const INITIAL_FIT_PADDING = { top: 40, right: 40, bottom: 40, left: 488 }

// Same as INITIAL_FIT_PADDING on narrow screens, where the panel sits above the map; used by MapView.
export const INITIAL_FIT_PADDING_NARROW = { top: 20, right: 20, bottom: 20, left: 20 }

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

// Highest zoom the heatmap points are cut into map tiles for; beyond it MapLibre stretches these tiles instead.
// MapLibre draws a circle only while the tile holding its center is on screen, and zoomed in that tile can be
// off screen while the circle still reaches in (the heatmap vanished). Tiles this big (about 22 degrees wide)
// almost always include the centers of the circles on screen; used by MapView.
export const HEATMAP_SOURCE_MAX_ZOOM = 4

// Heatmap circle radius as a share of a grid cell's width; above 1 so the blurred edges of neighbors overlap
// and blend into one area instead of separate dots; used by getHeatmapRadiusAtZoom0.
export const HEATMAP_CELL_COVERAGE = 1.25

// Heatmap circle opacity for Moderate and worse; low enough that the map and routes stay readable underneath;
// used by getHeatmapOpacityExpression.
export const HEATMAP_RISK_OPACITY = 0.45

// Fainter opacity for Low cells: the corridor stays visible as "checked, calm" without covering the map;
// used by getHeatmapOpacityExpression.
export const HEATMAP_LOW_OPACITY = 0.2

// Name of the unselected route lines inside MapLibre; used by MapView.
export const OTHER_ROUTES_SOURCE_ID = 'other-routes'

// Layer that draws the unselected routes as thin gray lines under the selected route; used by MapView.
export const OTHER_ROUTES_LAYER_ID = 'other-routes-line'

// Color of the unselected routes, a neutral gray apart from the risk colors; used by MapView.
export const OTHER_ROUTE_COLOR = '#6e7781'

// Thickness of the unselected routes (4px at zoom 9, growing with zoom), thinner than the selected one; used by MapView.
export const OTHER_ROUTE_WIDTH = getZoomScaledWidth(4)

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

// Dark gray outline under the route, so yellow and green stand out on the light map without a harsh black edge;
// used by MapView.
export const ROUTE_CASING_COLOR = '#424a53'

// Outline thickness (7px at zoom 9, growing with zoom); wider than ROUTE_LINE_WIDTH so a thin border shows on each
// side; used by MapView.
export const ROUTE_CASING_WIDTH = getZoomScaledWidth(7)

// Route line thickness (5px at zoom 9, growing with zoom); used by MapView.
export const ROUTE_LINE_WIDTH = getZoomScaledWidth(5)

// Thickness of the hovered or selected route stretch (9px at zoom 9, growing with zoom), drawn in its own risk color;
// used by MapView.
export const ROUTE_SEGMENT_HIGHLIGHT_WIDTH = getZoomScaledWidth(9)

// Checkpoint dot color, white so it shows on any route color; used by MapView.
export const CHECKPOINT_DOT_COLOR = '#ffffff'

// Checkpoint dot radius (3px at zoom 9, growing with zoom like the line), small enough to sit inside it;
// used by MapView.
export const CHECKPOINT_DOT_RADIUS = getZoomScaledWidth(3)

// Pixels between a clicked point and the segment popup next to it; used by MapView.
export const SEGMENT_POPUP_OFFSET = 10

// Milliseconds the camera takes to fly to a new route; used by MapView.
export const FIT_ANIMATION_MS = 1000

// Pixels kept around the route when zooming to it, so the start and end pins aren't at the edge;
// left clears the side panel (448px, lg:w-[28rem] in App) plus 100px, bottom clears the forecast card; used by MapView.
export const ROUTE_FIT_PADDING = { top: 100, right: 100, bottom: 280, left: 548 }

// Same as ROUTE_FIT_PADDING on narrow screens, where the panel sits above the map; used by MapView.
export const ROUTE_FIT_PADDING_NARROW = { top: 60, right: 40, bottom: 280, left: 40 }

// Closest zoom when fitting a route, so short trips keep their surroundings in view; used by MapView.
export const MAX_ROUTE_FIT_ZOOM = 9
