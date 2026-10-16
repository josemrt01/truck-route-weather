import { DEPARTURE_MAX_DAYS_AHEAD, DEPARTURE_TIME_STEP_MINUTES } from '../config/departureConfig'
import { DepartureMode, type DepartureOption, type DepartureSelection } from '../types/departure'
import { convertDateTimeLocalToIso, getDateTimeLocalValue, padDatePart } from './dateTime'

// Milliseconds in one day; used to find the latest departure the backend accepts.
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

// Minutes in one day; the time list runs from 00:00 up to (not including) this.
const MINUTES_PER_DAY = 24 * 60

// Day as the date button shows it after Tomorrow, e.g. "Sat, Oct 17".
const DAY_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// Time as the list shows it, e.g. "8:15 AM".
const TIME_FORMAT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

// Today and the next DEPARTURE_MAX_DAYS_AHEAD days, skipping a day with no time left in it.
export function getDepartureDays(now: Date): DepartureOption[] {
  const days: DepartureOption[] = []

  for (let dayOffset = 0; dayOffset <= DEPARTURE_MAX_DAYS_AHEAD; dayOffset++) {
    // new Date() rolls past the end of a month on its own (October 31 + 1 is November 1).
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset)
    const dayValue = getDayValue(date)

    // Late at night today has no time left, so it gets no button.
    if (getDepartureTimes(dayValue, now).length === 0) continue

    days.push({ value: dayValue, label: getDayLabel(date, dayOffset) })
  }

  return days
}

// Times on one day, every DEPARTURE_TIME_STEP_MINUTES, from now up to the latest departure the backend accepts.
export function getDepartureTimes(dayValue: string, now: Date): DepartureOption[] {
  const latestDeparture = new Date(now.getTime() + DEPARTURE_MAX_DAYS_AHEAD * MILLISECONDS_PER_DAY)
  const times: DepartureOption[] = []

  for (let minutes = 0; minutes < MINUTES_PER_DAY; minutes += DEPARTURE_TIME_STEP_MINUTES) {
    const timeValue = `${padDatePart(Math.floor(minutes / 60))}:${padDatePart(minutes % 60)}`
    const localValue = `${dayValue}T${timeValue}`
    // Text without a timezone offset is read as local time.
    const slot = new Date(localValue)

    // The clock skips 2:00-2:59 AM the night daylight saving time starts; those times don't exist.
    if (getDateTimeLocalValue(slot) !== localValue) continue

    // Skip times already past, and stop after the latest departure.
    if (slot < now) continue
    if (slot > latestDeparture) break

    times.push({ value: timeValue, label: TIME_FORMAT.format(slot) })
  }

  return times
}

// What "Depart at" starts with: the first day that has a time left, at its first time.
export function getFirstDepartureSelection(now: Date): DepartureSelection {
  const firstDay = getDepartureDays(now)[0]
  const firstTime = getDepartureTimes(firstDay.value, now)[0]

  return { dayValue: firstDay.value, timeValue: firstTime.value }
}

// The time to keep after the user picks another day: the same time if that day has it, else its first time.
export function getAvailableTime(dayValue: string, timeValue: string, now: Date): string {
  const times = getDepartureTimes(dayValue, now)

  for (const time of times) {
    if (time.value === timeValue) {
      return timeValue
    }
  }

  // A day always has a time when it has a button (see getDepartureDays).
  return times[0].value
}

// The departure the request sends, as ISO text in UTC.
export function buildDepartureIso(mode: DepartureMode, dayValue: string, timeValue: string, now: Date): string {
  if (mode === DepartureMode.NOW) {
    return now.toISOString()
  }

  return convertDateTimeLocalToIso(`${dayValue}T${timeValue}`)
}

// "2026-10-17": the date part of the local "YYYY-MM-DDTHH:mm" text; the calendar gives Dates, the form keeps these.
export function getDayValue(date: Date): string {
  return getDateTimeLocalValue(date).split('T')[0]
}

// Local midnight of a "YYYY-MM-DD" day; text without a timezone offset is read as local time.
export function getDateFromDayValue(dayValue: string): Date {
  return new Date(`${dayValue}T00:00`)
}

// True when both "YYYY-MM-DD" days fall in the same month; the calendar hides its month arrows then,
// because there is no other month to go to.
export function areInSameMonth(firstDayValue: string, lastDayValue: string): boolean {
  const firstDate = getDateFromDayValue(firstDayValue)
  const lastDate = getDateFromDayValue(lastDayValue)

  return firstDate.getFullYear() === lastDate.getFullYear() && firstDate.getMonth() === lastDate.getMonth()
}

function getDayLabel(date: Date, dayOffset: number): string {
  if (dayOffset === 0) return 'Today'
  if (dayOffset === 1) return 'Tomorrow'

  return DAY_FORMAT.format(date)
}
