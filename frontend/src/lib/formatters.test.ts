import { describe, expect, it } from 'vitest'
import { formatDistance, formatDuration, formatEta, formatPrecipitationRate, formatSpeed } from './formatters'

describe('formatDistance', () => {
  it('shows one decimal and the unit', () => {
    expect(formatDistance(239.04)).toBe('239.0 mi')
  })
})

describe('formatDuration', () => {
  it('shows hours and minutes', () => {
    // 12,395 s = 206.6 min, rounded to 207 min.
    expect(formatDuration(12_395)).toBe('3 h 27 min')
  })

  it('shows only minutes under an hour', () => {
    expect(formatDuration(1_500)).toBe('25 min')
  })

  it('rounds to whole minutes before splitting, so 59.8 min becomes 1 h 0 min', () => {
    expect(formatDuration(3_590)).toBe('1 h 0 min')
  })
})

// Tests run in America/Chicago (see vite.config.ts), which is UTC-5 in October.
describe('formatEta', () => {
  it('shows weekday and local time', () => {
    expect(formatEta('2026-10-13T21:26:00Z')).toBe('Tue 4:26 PM')
  })

  it('uses the local day when UTC has already moved to the next day', () => {
    expect(formatEta('2026-10-14T04:40:00Z')).toBe('Tue 11:40 PM')
  })
})

describe('formatSpeed', () => {
  it('shows whole miles per hour', () => {
    expect(formatSpeed(38.4)).toBe('38 mph')
  })
})

describe('formatPrecipitationRate', () => {
  it('shows two decimals and the unit', () => {
    expect(formatPrecipitationRate(0.05)).toBe('0.05 in/hr')
  })
})
