import { DRAWER_FULL_FRACTION, DRAWER_LOW_HEIGHT, DRAWER_MIDDLE_FRACTION } from '../config/layoutConfig'
import { DrawerStop } from '../types/drawerStop'

// The Base UI snap point for a stop; used by TripDrawer to place the drawer.
export function getSnapPointForStop(stop: DrawerStop): string | number {
  if (stop === DrawerStop.FULL) {
    return DRAWER_FULL_FRACTION
  }
  if (stop === DrawerStop.MIDDLE) {
    return DRAWER_MIDDLE_FRACTION
  }

  return DRAWER_LOW_HEIGHT
}

// The stop for a snap point Base UI reports after a drag; null (or an unknown value) means the low stop.
export function getStopForSnapPoint(snapPoint: string | number | null): DrawerStop {
  if (snapPoint === DRAWER_FULL_FRACTION) {
    return DrawerStop.FULL
  }
  if (snapPoint === DRAWER_MIDDLE_FRACTION) {
    return DrawerStop.MIDDLE
  }

  return DrawerStop.LOW
}

// The stop a tap on the handle moves to: up one stop, and from full back down to low.
export function getNextDrawerStop(stop: DrawerStop): DrawerStop {
  if (stop === DrawerStop.LOW) {
    return DrawerStop.MIDDLE
  }
  if (stop === DrawerStop.MIDDLE) {
    return DrawerStop.FULL
  }

  return DrawerStop.LOW
}
