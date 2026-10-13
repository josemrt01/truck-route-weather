import { API_ROUTES } from '../config/apiRoutes'
import { BackendStatus } from '../types/backendStatus'
import { apiClient } from './apiClient'

export async function getBackendStatus(): Promise<BackendStatus> {
  try {
    const response = await apiClient.get<{ status: string }>(API_ROUTES.HEALTH)

    // Only the exact "ok" answer means the backend is healthy.
    return response.data.status === BackendStatus.OK ? BackendStatus.OK : BackendStatus.UNREACHABLE
  } catch {
    // Network error, timeout, or an error status: the backend can't be reached.
    return BackendStatus.UNREACHABLE
  }
}
