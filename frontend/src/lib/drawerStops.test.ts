import { describe, expect, it } from 'vitest'
import { DRAWER_FULL_FRACTION, DRAWER_LOW_HEIGHT, DRAWER_MIDDLE_FRACTION } from '../config/layoutConfig'
import { DrawerStop } from '../types/drawerStop'
import { getNextDrawerStop, getSnapPointForStop, getStopForSnapPoint } from './drawerStops'

describe('getSnapPointForStop', () => {
  it('gives each stop its snap point', () => {
    expect(getSnapPointForStop(DrawerStop.LOW)).toBe(DRAWER_LOW_HEIGHT)
    expect(getSnapPointForStop(DrawerStop.MIDDLE)).toBe(DRAWER_MIDDLE_FRACTION)
    expect(getSnapPointForStop(DrawerStop.FULL)).toBe(DRAWER_FULL_FRACTION)
  })
})

describe('getStopForSnapPoint', () => {
  it('turns each snap point back into its stop', () => {
    expect(getStopForSnapPoint(DRAWER_LOW_HEIGHT)).toBe(DrawerStop.LOW)
    expect(getStopForSnapPoint(DRAWER_MIDDLE_FRACTION)).toBe(DrawerStop.MIDDLE)
    expect(getStopForSnapPoint(DRAWER_FULL_FRACTION)).toBe(DrawerStop.FULL)
  })

  it('falls back to the low stop for no snap point or an unknown one', () => {
    expect(getStopForSnapPoint(null)).toBe(DrawerStop.LOW)
    expect(getStopForSnapPoint('12px')).toBe(DrawerStop.LOW)
  })
})

describe('getNextDrawerStop', () => {
  it('goes low, middle, full, then back to low', () => {
    expect(getNextDrawerStop(DrawerStop.LOW)).toBe(DrawerStop.MIDDLE)
    expect(getNextDrawerStop(DrawerStop.MIDDLE)).toBe(DrawerStop.FULL)
    expect(getNextDrawerStop(DrawerStop.FULL)).toBe(DrawerStop.LOW)
  })
})
