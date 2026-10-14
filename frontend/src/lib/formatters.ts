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

// Short weekday and time in the browser's local timezone, e.g. "Tue 4:26 PM"; used for arrival times.
const ETA_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })

export function formatEta(isoUtc: string): string {
  return ETA_FORMAT.format(new Date(isoUtc))
}
