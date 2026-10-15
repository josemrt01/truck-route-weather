// Backend endpoint URLs; used by the functions in src/api/.
export const API_ROUTES = {
  // Backend liveness check; used by getBackendStatus.
  HEALTH: '/api/health',
  // Builds a route between two typed places; used by getTripPlan.
  TRIP_PLANS: '/api/trip-plans',
  // Risk level for every corridor point and forecast hour; used by getHeatmap.
  HEATMAP: '/api/heatmap',
} as const
