import { describe, expect, it } from 'vitest'
import { DepartureMode } from '../types/departure'
import {
  buildDepartureIso,
  getAvailableTime,
  getDepartureDays,
  getDepartureTimes,
  getFirstDepartureSelection,
} from './departureOptions'

// Tests run in America/Chicago (see vite.config.ts), which is UTC-5 in October.
// "Now" for most tests: Thursday, October 15, 2026, 8:07 AM local time.
const now = new Date(2026, 9, 15, 8, 7)

describe('getDepartureDays', () => {
  it('lists today and the next 7 days with readable labels', () => {
    const days = getDepartureDays(now)

    expect(days.map((day) => day.value)).toEqual([
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ])
    expect(days.map((day) => day.label)).toEqual([
      'Today',
      'Tomorrow',
      'Sat 17',
      'Sun 18',
      'Mon 19',
      'Tue 20',
      'Wed 21',
      'Thu 22',
    ])
  })

  it('leaves out today when no time is left in it', () => {
    const days = getDepartureDays(new Date(2026, 9, 15, 23, 50))

    expect(days[0]).toEqual({ value: '2026-10-16', label: 'Tomorrow' })
  })
})

describe('getDepartureTimes', () => {
  it('starts today at the next 15-minute slot', () => {
    const times = getDepartureTimes('2026-10-15', now)

    expect(times[0].value).toBe('08:15')
    expect(times[0].label).toMatch(/^8:15\sAM$/)
    expect(times[times.length - 1].value).toBe('23:45')
    expect(times).toHaveLength(63)
  })

  it('includes a slot that is exactly now', () => {
    expect(getDepartureTimes('2026-10-15', new Date(2026, 9, 15, 8, 15))[0].value).toBe('08:15')
  })

  it('lists the whole day for a day in the middle', () => {
    const times = getDepartureTimes('2026-10-17', now)

    expect(times[0].value).toBe('00:00')
    expect(times[times.length - 1].value).toBe('23:45')
    expect(times).toHaveLength(96)
  })

  it('stops the last day at 7 days from now', () => {
    const times = getDepartureTimes('2026-10-22', now)

    expect(times[times.length - 1].value).toBe('08:00')
    expect(times).toHaveLength(33)
  })
})

describe('getFirstDepartureSelection', () => {
  it('picks today at the next slot', () => {
    expect(getFirstDepartureSelection(now)).toEqual({ dayValue: '2026-10-15', timeValue: '08:15' })
  })

  it('moves to tomorrow when today has no time left', () => {
    expect(getFirstDepartureSelection(new Date(2026, 9, 15, 23, 50))).toEqual({
      dayValue: '2026-10-16',
      timeValue: '00:00',
    })
  })
})

describe('getAvailableTime', () => {
  it('keeps the time when the day has it', () => {
    expect(getAvailableTime('2026-10-17', '06:30', now)).toBe('06:30')
  })

  it('moves to the first time of the day when the old time is gone', () => {
    // 06:30 today is already past at 8:07 AM.
    expect(getAvailableTime('2026-10-15', '06:30', now)).toBe('08:15')
  })
})

describe('buildDepartureIso', () => {
  it('uses the current time for "Leave now"', () => {
    expect(buildDepartureIso(DepartureMode.NOW, '2026-10-17', '06:30', now)).toBe(now.toISOString())
  })

  it('reads the picked day and time as local time for "Depart at"', () => {
    expect(buildDepartureIso(DepartureMode.AT, '2026-10-17', '06:30', now)).toBe('2026-10-17T11:30:00.000Z')
  })
})
