// Screens narrower than 1024px (phones, upright tablets) get the map with a bottom drawer; wider ones get the
// side panel; used by useIsWideScreen and MapView.
export const NARROW_SCREEN_QUERY = '(max-width: 1023px)'

// Drawer height at its low stop: just the handle and the toolbar (about 20px + 59px); used by DRAWER_SNAP_POINTS
// and drawerStops.
export const DRAWER_LOW_HEIGHT = '80px'

// Drawer height at its middle stop, as a share of the screen height; used by drawerStops and getRouteFitPadding.
export const DRAWER_MIDDLE_FRACTION = 0.5

// Drawer height at its full stop, as a share of the screen height (a strip of map stays visible on top);
// used by drawerStops and TripDrawer (its height).
export const DRAWER_FULL_FRACTION = 0.92

// The three stops in Base UI's snap point format (px string or screen share), low to full; used by TripDrawer.
export const DRAWER_SNAP_POINTS: (string | number)[] = [DRAWER_LOW_HEIGHT, DRAWER_MIDDLE_FRACTION, DRAWER_FULL_FRACTION]

// Height in pixels of the compact forecast card plus its gap above the drawer; used by getRouteFitPadding.
export const COMPACT_FORECAST_CARD_HEIGHT = 120
