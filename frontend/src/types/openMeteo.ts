// One location's "hourly" object from Open-Meteo (GMT times, mph, inches); the browser fetches it and forwards it
// unchanged to /api/trip-risks and /api/heatmap, where the backend reads it.
export type OpenMeteoHourly = {
  // Hours like "2026-10-14T14:00"; position N in every list below is hour N.
  time: string[]
  // Open-Meteo sends null when a model has no value for an hour.
  wind_gusts_10m: (number | null)[]
  wind_speed_10m: (number | null)[]
  rain: (number | null)[]
  showers: (number | null)[]
  snowfall: (number | null)[]
}
