import axios from 'axios'
import { API_ROUTES } from '../config/apiRoutes'
import { TripPlanError, type ApiErrorResponse, type TripPlan, type TripPlanRequest } from '../types/tripPlan'
import { apiClient } from './apiClient'

export async function getTripPlan(request: TripPlanRequest): Promise<TripPlan> {
  try {
    const response = await apiClient.post<TripPlan>(API_ROUTES.TRIP_PLANS, request)
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
