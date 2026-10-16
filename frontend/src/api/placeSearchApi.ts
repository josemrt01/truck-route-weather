import { API_ROUTES } from '../config/apiRoutes'
import type { Place } from '../types/tripPlan'
import { apiClient } from './apiClient'

// Errors are left to the caller: usePlaceSuggestions ignores aborted searches and shows "Suggestions unavailable" for the rest.
export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  const response = await apiClient.get<Place[]>(API_ROUTES.PLACES, { params: { q: query }, signal })
  return response.data
}
