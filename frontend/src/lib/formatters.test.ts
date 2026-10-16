import { describe, expect, it } from 'vitest'
import {
  formatDistance,
  formatDuration,
  formatEta,
  formatForecastTime,
  formatHourMark,
  formatHoursFromNow,
  formatPrecipitationRate,
  formatSpeed,
  formatWeight,
} from './formatters'

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

// Tests run in America/Chicago (UTC-5 in October), so 13:00 UTC is 8:00 AM local.
describe('formatForecastTime', () => {
  it('adds the hours to the start hour and shows the local day and time', () => {
    expect(formatForecastTime('2026-10-13T13:00:00Z', 6)).toBe('Tue 2:00 PM')
  })

  it('uses the local day when UTC has already moved to the next day', () => {
    // 13:00 UTC + 15 h = 04:00 UTC on Wednesday, still 11:00 PM on Tuesday in Chicago.
    expect(formatForecastTime('2026-10-13T13:00:00Z', 15)).toBe('Tue 11:00 PM')
  })
})

describe('formatHoursFromNow', () => {
  it('says now for hour 0', () => {
    expect(formatHoursFromNow(0)).toBe('now')
  })

  it('uses the singular for one hour', () => {
    expect(formatHoursFromNow(1)).toBe('in 1 hour')
  })

  it('uses the plural for more hours', () => {
    expect(formatHoursFromNow(6)).toBe('in 6 hours')
  })
})

describe('formatHourMark', () => {
  it('shows hour 0 as Now', () => {
    expect(formatHourMark('2026-10-13T13:00:00Z', 0)).toBe('Now')
  })

  it('shows other marks as a short day and hour', () => {
    expect(formatHourMark('2026-10-13T13:00:00Z', 12)).toBe('Tue 8 PM')
  })
})

describe('formatWeight', () => {
  it('shows whole pounds with thousands separators', () => {
    expect(formatWeight(45_000)).toBe('45,000 lb')
  })
})
