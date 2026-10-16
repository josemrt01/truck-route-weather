import axios from 'axios'
import { API_ROUTES } from '../config/apiRoutes'
import { buildTripRisksRequest, getCheckpointPoints, getForecastWindow, mergeTripRisks } from '../lib/tripRisks'
import type { OpenMeteoHourly } from '../types/openMeteo'
import {
  TripPlanError,
  type ApiErrorResponse,
  type PlannedTrip,
  type TripPlan,
  type TripPlanRequest,
  type TripRisks,
} from '../types/tripPlan'
import { apiClient } from './apiClient'
import { getHourlyForecasts } from './openMeteoApi'

// Plans a trip in three steps: the backend finds the routes and checkpoints, the browser gets their forecasts from
// Open-Meteo, and the backend rates the risk and picks the best route. Every failure becomes a TripPlanError.
export async function getTripPlan(request: TripPlanRequest, weightLb: number): Promise<TripPlan> {
  const plannedTrip = await postToBackend<PlannedTrip>(API_ROUTES.TRIP_PLANS, request)

  const forecastWindow = getForecastWindow(plannedTrip.routes)
  let checkpointForecasts: OpenMeteoHourly[]
  try {
    checkpointForecasts = await getHourlyForecasts(
      getCheckpointPoints(plannedTrip.routes),
      forecastWindow.firstHourUtc,
      forecastWindow.lastHourUtc,
    )
  } catch {
    throw new TripPlanError('The weather service is unavailable. Please try again in a minute.', null)
  }

  const tripRisks = await postToBackend<TripRisks>(
    API_ROUTES.TRIP_RISKS,
    buildTripRisksRequest(plannedTrip.routes, checkpointForecasts, weightLb),
  )

  return mergeTripRisks(plannedTrip, tripRisks)
}

async function postToBackend<ResponseBody>(url: string, body: unknown): Promise<ResponseBody> {
  try {
    const response = await apiClient.post<ResponseBody>(url, body)
    return response.data
  } catch (error) {
    // The backend answered with our {error, field} shape: pass its message on to the form.
    const errorBody = axios.isAxiosError<ApiErrorResponse>(error) ? error.response?.data : undefined
    if (errorBody?.error) {
      throw new TripPlanError(errorBody.error, errorBody.field)
    }

    // No answer (network down, timeout) or an unexpected body: show a general message.
    throw new TripPlanError("Couldn't reach the server. Check your connection and try again.", null)
  }
}
