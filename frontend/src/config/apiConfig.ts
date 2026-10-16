// Milliseconds to wait for the backend before giving up; used by apiClient.
export const API_TIMEOUT_MS = 30_000

// Open-Meteo's hourly forecast API (free, no key); the browser calls it directly so the free daily limit counts per
// visitor, not per server; used by getHourlyForecasts.
export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

// Most locations Open-Meteo accepts in one request; used by getHourlyForecasts to split big lists.
export const OPEN_METEO_MAX_POINTS_PER_REQUEST = 100

// Weather values asked for every hour, the ones the backend's risk rules read; used by getHourlyForecasts.
export const OPEN_METEO_HOURLY_VARIABLES = 'wind_gusts_10m,wind_speed_10m,rain,showers,snowfall'

// Forecast hours the heatmap covers, now (hour 0) through 48 hours ahead; must match HEATMAP_HOURS in the backend;
// used by getHeatmap.
export const HEATMAP_HOURS = 49
