import axios from 'axios'
import {
  API_TIMEOUT_MS,
  OPEN_METEO_FORECAST_URL,
  OPEN_METEO_HOURLY_VARIABLES,
  OPEN_METEO_MAX_POINTS_PER_REQUEST,
} from '../config/apiConfig'
import type { OpenMeteoHourly } from '../types/openMeteo'
import type { LonLat } from '../types/tripPlan'

// Length of "YYYY-MM-DDTHH" in an ISO time; used by formatOpenMeteoHour.
const ISO_HOUR_LENGTH = 13

// What Open-Meteo returns for one location; only the hourly lists are used.
type OpenMeteoLocation = { hourly: OpenMeteoHourly }

// One "hourly" object per point, in the same order, from firstHourUtc to lastHourUtc (both included).
// Errors are left to the caller.
export async function getHourlyForecasts(
  points: LonLat[],
  firstHourUtc: Date,
  lastHourUtc: Date,
): Promise<OpenMeteoHourly[]> {
  const forecasts: OpenMeteoHourly[] = []

  // Open-Meteo accepts at most OPEN_METEO_MAX_POINTS_PER_REQUEST points per request, so take them in batches.
  for (let batchStart = 0; batchStart < points.length; batchStart += OPEN_METEO_MAX_POINTS_PER_REQUEST) {
    const batch = points.slice(batchStart, batchStart + OPEN_METEO_MAX_POINTS_PER_REQUEST)

    const latitudes: number[] = []
    const longitudes: number[] = []
    for (const [lon, lat] of batch) {
      latitudes.push(lat)
      longitudes.push(lon)
    }

    const response = await axios.get<OpenMeteoLocation | OpenMeteoLocation[]>(OPEN_METEO_FORECAST_URL, {
      params: {
        // Comma-separated lists; position N in both lists is point N.
        latitude: latitudes.join(','),
        longitude: longitudes.join(','),
        hourly: OPEN_METEO_HOURLY_VARIABLES,
        wind_speed_unit: 'mph',
        // Also converts snowfall from centimeters to inches.
        precipitation_unit: 'inch',
        timezone: 'GMT',
        start_hour: formatOpenMeteoHour(firstHourUtc),
        end_hour: formatOpenMeteoHour(lastHourUtc),
      },
      timeout: API_TIMEOUT_MS,
    })

    // With a single point Open-Meteo returns one object instead of a list.
    const locations = Array.isArray(response.data) ? response.data : [response.data]
    for (const location of locations) {
      forecasts.push(location.hourly)
    }
  }

  return forecasts
}

// The hour format Open-Meteo expects for start_hour and end_hour, in UTC, e.g. "2026-10-13T13:00".
function formatOpenMeteoHour(hourUtc: Date): string {
  return `${hourUtc.toISOString().slice(0, ISO_HOUR_LENGTH)}:00`
}
