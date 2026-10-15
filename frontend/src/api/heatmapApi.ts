import { API_ROUTES } from '../config/apiRoutes'
import type { Heatmap, HeatmapRequest } from '../types/heatmap'
import { apiClient } from './apiClient'

// Errors are left to the caller: App shows "Weather map unavailable" and keeps the routes on screen.
export async function getHeatmap(request: HeatmapRequest): Promise<Heatmap> {
  const response = await apiClient.post<Heatmap>(API_ROUTES.HEATMAP, request)
  return response.data
}
