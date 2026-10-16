import { COMPACT_FORECAST_CARD_HEIGHT, DRAWER_MIDDLE_FRACTION } from '../config/layoutConfig'
import { MIN_ROUTE_FIT_HEIGHT, ROUTE_FIT_PADDING, ROUTE_FIT_PADDING_NARROW_SIDES } from '../config/mapConfig'

// Pixels kept clear on each side when the camera zooms to a route.
export type RouteFitPadding = { top: number; right: number; bottom: number; left: number }

// Padding for zooming to a new plan's routes, so they fit in the part of the map the panel doesn't cover.
// Narrow screens: the drawer opens at half height with the compact card on top, so that much stays clear below.
export function getRouteFitPadding(isWideScreen: boolean, viewportHeight: number): RouteFitPadding {
  if (isWideScreen) {
    return ROUTE_FIT_PADDING
  }

  const coveredHeight = viewportHeight * DRAWER_MIDDLE_FRACTION + COMPACT_FORECAST_CARD_HEIGHT
  // On a short screen the drawer and card would leave no map, and MapLibre refuses to fit; keep some map.
  const largestBottom = viewportHeight - ROUTE_FIT_PADDING_NARROW_SIDES.top - MIN_ROUTE_FIT_HEIGHT
  const bottom = Math.min(coveredHeight, largestBottom)

  return {
    top: ROUTE_FIT_PADDING_NARROW_SIDES.top,
    right: ROUTE_FIT_PADDING_NARROW_SIDES.right,
    bottom,
    left: ROUTE_FIT_PADDING_NARROW_SIDES.left,
  }
}
