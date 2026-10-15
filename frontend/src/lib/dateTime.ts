// Pads one-digit date parts ("7" -> "07"); used by getDateTimeLocalValue.
const DATE_PART_LENGTH = 2

// Returns the date as "YYYY-MM-DDTHH:mm" in the browser's local time, the format <input type="datetime-local"> uses.
export function getDateTimeLocalValue(date: Date): string {
  const pad = (part: number) => String(part).padStart(DATE_PART_LENGTH, '0')

  // getMonth() counts from 0 (January = 0), so add 1.
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}`

  return `${datePart}T${timePart}`
}

// Turns a datetime-local value (browser local time) into ISO text in UTC; '' when the value isn't a valid time.
export function convertDateTimeLocalToIso(value: string): string {
  // The browser reads "YYYY-MM-DDTHH:mm" without an offset as local time.
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

// Milliseconds in one hour; used by getForecastHourTime.
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000

// The moment a forecast hour stands for: hour 0 is startHourUtc, hour 6 is six hours later;
// used by the slider label and the truck marker.
export function getForecastHourTime(startHourUtc: string, hour: number): Date {
  return new Date(new Date(startHourUtc).getTime() + hour * MILLISECONDS_PER_HOUR)
}

// Part of the forecast window the trip covers, in hours from hour 0 (may be fractional, e.g. 3.5).
export type TripHourRange = {
  startHour: number
  endHour: number
}

// Where the trip falls on the 0-lastHour forecast slider; null when it starts after the slider's last hour.
// Hours outside the slider are clamped to its ends, so a trip running past +48h stops at +48h.
export function getTripHourRange(
  startHourUtc: string,
  departureUtc: string,
  arrivalUtc: string,
  lastHour: number,
): TripHourRange | null {
  const sliderStart = new Date(startHourUtc).getTime()
  const departureHour = (new Date(departureUtc).getTime() - sliderStart) / MILLISECONDS_PER_HOUR
  const arrivalHour = (new Date(arrivalUtc).getTime() - sliderStart) / MILLISECONDS_PER_HOUR

  if (departureHour > lastHour) {
    return null
  }

  return {
    startHour: Math.max(departureHour, 0),
    endHour: Math.min(arrivalHour, lastHour),
  }
}
