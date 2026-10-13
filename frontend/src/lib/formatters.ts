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
