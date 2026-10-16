import { getForecastHourTime } from './dateTime'

// Unit conversions for formatDuration; private to this file.
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60

export function formatDistance(miles: number): string {
  return `${miles.toFixed(1)} mi`
}

export function formatDuration(seconds: number): string {
  // Round to whole minutes first, so 59.6 min becomes "1 h 0 min", not "0 h 60 min".
  const totalMinutes = Math.round(seconds / SECONDS_PER_MINUTE)
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR

  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`
}

// Short weekday and time in the browser's local timezone, e.g. "Tue 4:26 PM"; US style, since routes are US-only.
const ETA_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })

export function formatEta(isoUtc: string): string {
  return ETA_FORMAT.format(new Date(isoUtc))
}

// Whole miles per hour, e.g. "38 mph".
export function formatSpeed(mph: number): string {
  return `${Math.round(mph)} mph`
}

// Inches per hour with two decimals, e.g. "0.05 in/hr"; rain risk thresholds start at 0.10.
export function formatPrecipitationRate(inchesPerHour: number): string {
  return `${inchesPerHour.toFixed(2)} in/hr`
}

// Local day and time of a forecast hour, e.g. "Tue 2:00 PM"; the forecast card's main time.
export function formatForecastTime(startHourUtc: string, hour: number): string {
  return formatEta(getForecastHourTime(startHourUtc, hour).toISOString())
}

// How far a forecast hour is from now in plain words: "now", "in 1 hour", "in 6 hours".
export function formatHoursFromNow(hour: number): string {
  if (hour === 0) return 'now'
  if (hour === 1) return 'in 1 hour'

  return `in ${hour} hours`
}

// Short day and hour for the marks under the forecast slider, e.g. "Tue 8 PM"; hour 0 is "Now".
const HOUR_MARK_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric' })

export function formatHourMark(startHourUtc: string, hour: number): string {
  if (hour === 0) return 'Now'

  return HOUR_MARK_FORMAT.format(getForecastHourTime(startHourUtc, hour))
}

// Whole pounds with thousands separators, e.g. "45,000 lb".
export function formatWeight(pounds: number): string {
  return `${pounds.toLocaleString('en-US')} lb`
}
