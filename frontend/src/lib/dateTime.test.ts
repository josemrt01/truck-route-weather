import { describe, expect, it } from 'vitest'
import { convertDateTimeLocalToIso, getDateTimeLocalValue } from './dateTime'

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
