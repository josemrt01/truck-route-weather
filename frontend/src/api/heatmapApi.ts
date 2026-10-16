import { HEATMAP_HOURS } from '../config/apiConfig'
import { API_ROUTES } from '../config/apiRoutes'
import { addHours, roundDownToHour } from '../lib/dateTime'
import type { Heatmap, HeatmapRequest } from '../types/heatmap'
import type { LonLat } from '../types/tripPlan'
import { apiClient } from './apiClient'
import { getHourlyForecasts } from './openMeteoApi'

// The browser gets 49 hours of forecasts (this hour onward) for the corridor points from Open-Meteo, and the backend
// turns them into risk levels for this truck.
// Errors are left to the caller: App shows "Weather map unavailable" and keeps the routes on screen.
export async function getHeatmap(points: LonLat[], weightLb: number): Promise<Heatmap> {
  const firstHourUtc = roundDownToHour(new Date())
  const forecasts = await getHourlyForecasts(points, firstHourUtc, addHours(firstHourUtc, HEATMAP_HOURS - 1))

  const requestPoints: HeatmapRequest['points'] = []
  for (let index = 0; index < points.length; index++) {
    const [lon, lat] = points[index]
    requestPoints.push({ lon, lat, forecast: forecasts[index] })
  }

  const response = await apiClient.post<Heatmap>(API_ROUTES.HEATMAP, { points: requestPoints, weight_lb: weightLb })
  return response.data
}
