// Backend endpoint URLs; used by the functions in src/api/.
export const API_ROUTES = {
  // Backend liveness check; used by getBackendStatus.
  HEALTH: '/api/health',
} as const
