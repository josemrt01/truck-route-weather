// Map look (OpenFreeMap "liberty" vector style, no API key); used by MapView.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

// Starting camera, centered on the continental US; used by MapView.
export const INITIAL_MAP_VIEW = { longitude: -98.5, latitude: 39.5, zoom: 3.5 }

// Name of the route data inside MapLibre; used by MapView.
export const ROUTE_SOURCE_ID = 'route'

// Name of the drawn route layer; later layers (checkpoints, heatmap) stack relative to it; used by MapView.
export const ROUTE_LAYER_ID = 'route-line'

// Route line color; a JS value because MapLibre paints on a canvas and can't read CSS variables; used by MapView.
export const ROUTE_LINE_COLOR = '#0969da'

// Route line thickness in pixels; used by MapView.
export const ROUTE_LINE_WIDTH = 5

// Milliseconds the camera takes to fly to a new route; used by MapView.
export const FIT_ANIMATION_MS = 1000

// Screens narrower than 768px, the same breakpoint as App.css; used by MapView to pick the fit padding.
export const NARROW_SCREEN_QUERY = '(max-width: 767px)'

// Pixels kept around the route when zooming to it, so the start and end pins aren't at the edge;
// left also clears the side panel (12px gap + 320px panel); used by MapView.
export const ROUTE_FIT_PADDING = { top: 100, right: 100, bottom: 100, left: 432 }

// Same as ROUTE_FIT_PADDING on narrow screens, where the panel sits above the map; used by MapView.
export const ROUTE_FIT_PADDING_NARROW = { top: 100, right: 100, bottom: 100, left: 100 }

// Closest zoom when fitting a route, so short trips keep their surroundings in view; used by MapView.
export const MAX_ROUTE_FIT_ZOOM = 9

// Start pin color (dark slate, apart from the risk colors); used by RouteEndpointMarker.
export const START_MARKER_COLOR = '#1f2328'

// End pin color, the same blue as the route line; used by RouteEndpointMarker.
export const END_MARKER_COLOR = ROUTE_LINE_COLOR
