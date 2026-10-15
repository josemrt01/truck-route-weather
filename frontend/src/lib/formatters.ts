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

// Hours from now and the local time of that forecast hour, e.g. "+6h · Tue 2:00 PM".
export function formatForecastHourLabel(startHourUtc: string, hour: number): string {
  const forecastTime = getForecastHourTime(startHourUtc, hour)
  return `+${hour}h · ${formatEta(forecastTime.toISOString())}`
}

// Hours from the slider's start with at most one decimal, e.g. "+3.5h" or "+0h".
export function formatHourOffset(hours: number): string {
  // Multiply, round, divide: keeps one decimal and drops ".0" (3.0 shows as 3).
  const roundedHours = Math.round(hours * 10) / 10
  return `+${roundedHours}h`
}
