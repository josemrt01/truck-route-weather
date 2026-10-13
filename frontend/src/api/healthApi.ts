import { API_ROUTES } from '../config/apiRoutes'
import { BackendStatus } from '../types/backendStatus'

export async function getBackendStatus(): Promise<BackendStatus> {
  try {
    const response = await fetch(API_ROUTES.HEALTH)
    const data: { status: string } = await response.json()

    // Only the exact "ok" answer means the backend is healthy.
    return data.status === BackendStatus.OK ? BackendStatus.OK : BackendStatus.UNREACHABLE
  } catch {
    // Network error or a non-JSON answer: the backend can't be reached.
    return BackendStatus.UNREACHABLE
  }
}
