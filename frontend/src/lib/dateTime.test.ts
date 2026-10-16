import { describe, expect, it } from 'vitest'
import {
  addHours,
  convertDateTimeLocalToIso,
  getDateTimeLocalValue,
  getTripHourRange,
  roundDownToHour,
  roundUpToHour,
} from './dateTime'

// Tests run in America/Chicago (see vite.config.ts), which is UTC-5 in October.
describe('getDateTimeLocalValue', () => {
  it('formats local time as YYYY-MM-DDTHH:mm with zero padding', () => {
    // Months count from 0 in new Date(), so 9 is October.
    expect(getDateTimeLocalValue(new Date(2026, 9, 3, 7, 5))).toBe('2026-10-03T07:05')
  })
})

describe('convertDateTimeLocalToIso', () => {
  it('reads the value as local time and returns UTC', () => {
    expect(convertDateTimeLocalToIso('2026-10-03T07:05')).toBe('2026-10-03T12:05:00.000Z')
  })

  it('returns empty text for an empty or invalid value', () => {
    expect(convertDateTimeLocalToIso('')).toBe('')
    expect(convertDateTimeLocalToIso('not a date')).toBe('')
  })

  it('round-trips with getDateTimeLocalValue to the minute', () => {
    const date = new Date(2026, 11, 31, 23, 59)

    expect(convertDateTimeLocalToIso(getDateTimeLocalValue(date))).toBe(date.toISOString())
  })
})

describe('getTripHourRange', () => {
  // The slider's hour 0; tests place departure and arrival relative to it.
  const SLIDER_START = '2026-10-13T13:00:00Z'

  it('places a trip inside the window in hours from hour 0', () => {
    // Departs 13:00, arrives 16:30: hours 0 to 3.5.
    expect(getTripHourRange(SLIDER_START, '2026-10-13T13:00:00Z', '2026-10-13T16:30:00Z', 48)).toEqual({
      startHour: 0,
      endHour: 3.5,
    })
  })

  it('places a later departure further along', () => {
    // Departs 15 hours after hour 0.
    expect(getTripHourRange(SLIDER_START, '2026-10-14T04:00:00Z', '2026-10-14T07:30:00Z', 48)).toEqual({
      startHour: 15,
      endHour: 18.5,
    })
  })

  it('stops a trip that runs past the window at the last hour', () => {
    expect(getTripHourRange(SLIDER_START, '2026-10-15T09:00:00Z', '2026-10-15T20:00:00Z', 48)).toEqual({
      startHour: 44,
      endHour: 48,
    })
  })

  it('starts at hour 0 when the departure was a few minutes before it', () => {
    expect(getTripHourRange(SLIDER_START, '2026-10-13T12:50:00Z', '2026-10-13T16:00:00Z', 48)?.startHour).toBe(0)
  })

  it('is null when the trip starts after the window', () => {
    expect(getTripHourRange(SLIDER_START, '2026-10-16T13:00:00Z', '2026-10-16T17:00:00Z', 48)).toBeNull()
  })
})

describe('roundDownToHour', () => {
  it('drops the minutes', () => {
    expect(roundDownToHour(new Date('2026-10-13T14:37:00Z'))).toEqual(new Date('2026-10-13T14:00:00Z'))
  })
})

describe('roundUpToHour', () => {
  it('goes to the next full hour', () => {
    expect(roundUpToHour(new Date('2026-10-13T14:37:00Z'))).toEqual(new Date('2026-10-13T15:00:00Z'))
  })

  it('keeps a moment that already is a full hour', () => {
    expect(roundUpToHour(new Date('2026-10-13T14:00:00Z'))).toEqual(new Date('2026-10-13T14:00:00Z'))
  })
})

describe('addHours', () => {
  it('moves a moment by whole hours', () => {
    expect(addHours(new Date('2026-10-13T13:00:00Z'), 48)).toEqual(new Date('2026-10-15T13:00:00Z'))
  })
})
